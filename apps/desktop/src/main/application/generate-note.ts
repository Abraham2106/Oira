import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { isAppError } from "../errors/core"
import { encounterNotFoundError } from "../errors/encounters"
import { invalidStructuredOutputError } from "../errors/notes"
import { verifySource } from "../notes/verify-source"
import { runVerification } from "../structure/evidence"
import type { NoteVerifierPort, NoteVerificationResult } from "../../shared/types/note-verification"
import type { EncounterPort } from "../ports/inbound"
import type {
  AudioCapturePort,
  ProgressPort,
  StructuringPort,
  TranscriptionPort,
} from "../ports/outbound"
import type { InferenceRuntimePort } from "../inference/port"

export const DEFAULT_STRUCTURE_ATTEMPTS = 2

export type GenerateNoteWorkflowDeps = {
  transcription: TranscriptionPort
  structuring: StructuringPort
  encounters?: EncounterPort
  audio?: AudioCapturePort
  progress?: ProgressPort
  structureAttempts?: number
  inferenceRuntime?: InferenceRuntimePort
  reviewer?: NoteVerifierPort
}

/** Defensive precondition: callers must pass a real encounter id. */
export function assertEncounterId(encounterId: string): void {
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw encounterNotFoundError()
  }
}

async function advanceEncounter(
  encounters: EncounterPort | undefined,
  encounterId: string,
  to: "transcribed" | "failed",
): Promise<void> {
  if (!encounters) return
  try {
    await encounters.advance(encounterId, to)
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}

/**
 * In-process note pipeline: transcribe → structure → verify.
 * I/O lives in port adapters.
 */
export async function runGenerateNote(
  encounterId: string,
  deps: GenerateNoteWorkflowDeps,
): Promise<GenerateNoteResult> {
  assertEncounterId(encounterId)
  const attempts = deps.structureAttempts ?? DEFAULT_STRUCTURE_ATTEMPTS

  if (deps.encounters) {
    const record = await deps.encounters.getById(encounterId)
    if (!record) throw encounterNotFoundError()
  }

  deps.progress?.emit({ encounterId, phase: "transcribing" })
  let transcriptForFailure: GenerateNoteResult["transcript"] | undefined
  try {
    const filePath = deps.audio ? deps.audio.wavPath(encounterId) : undefined
    if (deps.audio && !filePath) throw audioCaptureFailedError()
    const { segments } = await deps.transcription.transcribe({
      filePath: filePath ?? "",
    })
    transcriptForFailure = segments

    // Renderer reveal and model handoff run independently: never wait for a UI
    // acknowledgement or animation timer before releasing Whisper/loading Qwen.
    deps.progress?.emit({ encounterId, phase: "structuring", transcript: segments })
    await deps.inferenceRuntime?.handoffToStructuring()
    let lastError: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const result = await deps.structuring.structure({
          transcript: segments,
        })
        if (result.kind === "draft_unvalidated") {
          // Nunca un éxito silencioso: el borrador no validado conserva la
          // transcripción, marca el intento, y el renderer lo muestra como tal.
          await advanceEncounter(deps.encounters, encounterId, "failed")
          deps.progress?.emit({
            encounterId,
            phase: "failed",
            stage: "structuring",
            transcript: segments,
          })
          return {
            status: "draft_unvalidated",
            transcript: segments,
            draftText: result.draftText,
            issues: result.issues,
          }
        }
        const { note } = result
        const parsed = clinicalNoteSchema.safeParse(note)
        if (!parsed.success) throw invalidStructuredOutputError()
        if (!verifySource(parsed.data, segments)) {
          throw invalidStructuredOutputError()
        }
        // Run heuristic verification on the valid structured output
        const { warnings: verificationWarnings, blocking } = runVerification(parsed.data, segments)

        // If there are blocking heuristic issues, treat as draft_unvalidated
        if (blocking.length > 0) {
          await advanceEncounter(deps.encounters, encounterId, "failed")
          deps.progress?.emit({
            encounterId,
            phase: "failed",
            stage: "structuring",
            transcript: segments,
          })
          return {
            status: "draft_unvalidated",
            transcript: segments,
            draftText: JSON.stringify(parsed.data, null, 2),
            issues: blocking.map((b) => ({ code: b.code, sectionId: b.sectionId, message: b.message })),
          }
        }

        // Run Qwen reviewer if available (F3)
        let reviewerResult: NoteVerificationResult | undefined
        if (deps.reviewer) {
          deps.progress?.emit({ encounterId, phase: "reviewing" })
          reviewerResult = await deps.reviewer.verify({ transcript: segments, note: parsed.data })
        }

        await advanceEncounter(deps.encounters, encounterId, "transcribed")
        return {
          status: "ok",
          transcript: segments,
          note: parsed.data,
          verificationWarnings: verificationWarnings.map((w) => ({
            code: w.code,
            sectionId: w.sectionId,
            message: w.message,
          })),
          reviewerResult,
        }
      } catch (error) {
        lastError = error
        const retryable =
          isAppError(error) && error.code === "INVALID_STRUCTURED_OUTPUT"
        if (!retryable) throw error
      }
    }
    throw lastError
  } catch (error) {
    await advanceEncounter(deps.encounters, encounterId, "failed")
    deps.progress?.emit({
      encounterId,
      phase: "failed",
      ...(transcriptForFailure
        ? { transcript: transcriptForFailure, stage: "structuring" as const }
        : { stage: "transcription" as const }),
    })
    throw error
  } finally {
    deps.audio?.purge(encounterId)
  }
}
