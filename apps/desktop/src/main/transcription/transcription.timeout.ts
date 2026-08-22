/** Placeholder until Q12 measures realTimeFactor on target hardware. Not a published claim. */
export const TRANSCRIPTION_RTF_FACTOR_UNVERIFIED = 8
export const TRANSCRIPTION_MIN_TIMEOUT_MS = 60_000
export const TRANSCRIPTION_MAX_RETRIES = 1

export function transcriptionTimeoutMs(audioDurationMs: number): number {
  return Math.max(
    TRANSCRIPTION_MIN_TIMEOUT_MS,
    Math.ceil(audioDurationMs * TRANSCRIPTION_RTF_FACTOR_UNVERIFIED),
  )
}
