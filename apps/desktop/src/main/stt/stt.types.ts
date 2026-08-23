import type { TranscriptSegment } from "@oira/types"
import { createAppError, type AppError } from "../errors/core"

/** One captured piece of consultation audio, in capture order. */
export type AudioChunk = {
  sequence: number
  mimeType: string
  bytes: Uint8Array
  durationMs: number | null
}

/**
 * Failures reuse the repo AppError conventions and the closed shared code set
 * (no new codes are introduced here). The `cause` field stays local to Main
 * and is stripped by `toSerializableError` before crossing IPC.
 */
export type SttError = AppError

/**
 * Same shape as the shared `Result<T>` but carrying the richer local
 * `SttError`. It remains assignable to `Result<T>` once passed through
 * `toSerializableError`, so IPC layers can serialize without remapping.
 */
export type SttResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; error: SttError }

/**
 * Speech-to-text seam (VISION.md workstream 2). Implementations live in Main;
 * the renderer never touches engines directly. Swap the fake engine for the
 * QVAC adapter without touching callers.
 */
export type SttPort = {
  transcribe(chunks: readonly AudioChunk[]): Promise<SttResult<TranscriptSegment[]>>
}

export function sttEngineUnavailableError(): SttError {
  return createAppError(
    "NOT_IMPLEMENTED",
    "Local speech-to-text is not available in this build.",
    {
      hint: "The QVAC (@qvac/sdk) engine integration lands in qvac-stt.adapter.ts.",
      retryable: false,
    },
  )
}

export function emptyAudioInputError(): SttError {
  return createAppError(
    "INVALID_INPUT",
    "No audio chunks were provided to transcribe.",
    {
      hint: "Capture at least one AudioChunk before calling transcribe.",
      retryable: false,
    },
  )
}
