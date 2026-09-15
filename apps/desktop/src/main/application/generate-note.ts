import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { addSecondaryFailure, isAppError } from "../errors/core"
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
  onCleanupFailure?: (input: { encounterId: string; primaryFailure: boolean }) => void
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
  await encounters.advance(encounterId, to)
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
  let generated: GenerateNoteResult | undefined
  let primaryFailure: unknown
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
          generated = {
            status: "draft_unvalidated",
            transcript: segments,
            draftText: result.draftText,
            issues: result.issues,
          }
          break
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
          generated = {
            status: "draft_unvalidated",
            transcript: segments,
            draftText: JSON.stringify(parsed.data, null, 2),
            issues: blocking.map((b) => ({ code: b.code, sectionId: b.sectionId, message: b.message })),
          }
          break
        }

        // Run Qwen reviewer if available (F3)
        let reviewerResult: NoteVerificationResult | undefined
        if (deps.reviewer) {
          deps.progress?.emit({ encounterId, phase: "reviewing" })
          reviewerResult = await deps.reviewer.verify({ transcript: segments, note: parsed.data })
        }

        await advanceEncounter(deps.encounters, encounterId, "transcribed")
        generated = {
          status: "READY",
          transcript: segments,
          note: parsed.data,
          verificationWarnings: verificationWarnings.map((w) => ({
            code: w.code,
            sectionId: w.sectionId,
            message: w.message,
          })),
          reviewerResult,
        }
        break
      } catch (error) {
        lastError = error
        const retryable =
          isAppError(error) && error.code === "INVALID_STRUCTURED_OUTPUT"
        if (!retryable) throw error
      }
    }
    if (!generated) throw lastError
  } catch (error) {
    primaryFailure = error
    try {
      await advanceEncounter(deps.encounters, encounterId, "failed")
    } catch (secondaryError) {
      addSecondaryFailure(primaryFailure, "encounter_transition", secondaryError)
    }
    deps.progress?.emit({
      encounterId,
      phase: "failed",
      ...(transcriptForFailure
        ? { transcript: transcriptForFailure, stage: "structuring" as const }
        : { stage: "transcription" as const }),
    })
  }
  try {
    await deps.inferenceRuntime?.releaseStructuring()
  } catch {
    /* GPU release must not hide a generated note or the primary failure */
  }
  let cleanupFailed = false
  try {
    deps.audio?.purge(encounterId)
  } catch (cleanupError) {
    cleanupFailed = true
    addSecondaryFailure(primaryFailure, "audio_cleanup", cleanupError)
    deps.onCleanupFailure?.({ encounterId, primaryFailure: primaryFailure !== undefined })
  }
  if (primaryFailure !== undefined) throw primaryFailure
  if (!generated) throw invalidStructuredOutputError()
  if (cleanupFailed) {
    if (generated.status === "draft_unvalidated") {
      return { ...generated, cleanup: { retryable: true } }
    }
    return { ...generated, status: "CLEANUP_PENDING", cleanup: { retryable: true } }
  }
  return generated
}
