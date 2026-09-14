import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { addSecondaryFailure, isAppError } from "../errors/core"
import { encounterNotFoundError } from "../errors/encounters"
import { invalidStructuredOutputError } from "../errors/notes"
import { verifySource } from "../notes/verify-source"
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
        const { note } = await deps.structuring.structure({
          transcript: segments,
        })
        const parsed = clinicalNoteSchema.safeParse(note)
        if (!parsed.success) throw invalidStructuredOutputError()
        if (!verifySource(parsed.data, segments)) {
          throw invalidStructuredOutputError()
        }
        await advanceEncounter(deps.encounters, encounterId, "transcribed")
        generated = { status: "READY", transcript: segments, note: parsed.data }
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
      // Preserve the generation failure; recovery-state failure is secondary.
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

  let cleanupFailed = false
  try {
    deps.audio?.purge(encounterId)
  } catch (cleanupError) {
    cleanupFailed = true
    addSecondaryFailure(primaryFailure, "audio_cleanup", cleanupError)
    // The observer records only a technical identifier and stage, never audio data.
    deps.onCleanupFailure?.({ encounterId, primaryFailure: primaryFailure !== undefined })
  }

  if (primaryFailure !== undefined) throw primaryFailure
  if (!generated) throw invalidStructuredOutputError()
  if (cleanupFailed) {
    return {
      status: "CLEANUP_PENDING",
      transcript: generated.transcript,
      note: generated.note,
      cleanup: { retryable: true },
    }
  }
  return generated
}
