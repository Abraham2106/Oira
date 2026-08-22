/**
 * Closed set of product error codes (guide §19 + honest stub / IPC codes).
 * Domain modules under `src/main/errors/` must pick from this list — do not
 * invent free-form strings at call sites.
 */
export const APP_ERROR_CODES = [
  "MODEL_NOT_READY",
  "MIC_PERMISSION_DENIED",
  "AUDIO_CAPTURE_FAILED",
  "TRANSCRIPTION_FAILED",
  "INVALID_STRUCTURED_OUTPUT",
  "DATABASE_ERROR",
  "EXPORT_FAILED",
  "LOW_MEMORY",
  "DISK_FULL",
  "INVALID_INPUT",
  "PATH_TRAVERSAL_BLOCKED",
  "NOT_AUTHENTICATED",
  "INVALID_STATE_TRANSITION",
  "OPERATION_CANCELLED",
  "AUDIO_FORMAT_UNSUPPORTED",
  "MODEL_DOWNLOAD_FAILED",
  /** Feature or adapter not wired yet — never pretend success. */
  "NOT_IMPLEMENTED",
  /** Unknown failure at a trust boundary; not SQLite-specific. */
  "INTERNAL_ERROR",
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    typeof value === "string" &&
    (APP_ERROR_CODES as readonly string[]).includes(value)
  )
}
