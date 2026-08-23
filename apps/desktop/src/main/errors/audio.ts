import { createAppError, type AppError } from "./core"

export function pathTraversalBlockedError(): AppError {
  return createAppError(
    "PATH_TRAVERSAL_BLOCKED",
    "That audio path is not allowed.",
    { retryable: false },
  )
}

export function audioCaptureFailedError(
  message = "Audio capture failed.",
): AppError {
  return createAppError("AUDIO_CAPTURE_FAILED", message, { retryable: false })
}

export function audioFormatUnsupportedError(): AppError {
  return createAppError(
    "AUDIO_FORMAT_UNSUPPORTED",
    "Audio must be PCM 16-bit little-endian, even length.",
    { retryable: false },
  )
}

export function audioTooLargeError(): AppError {
  return createAppError(
    "DISK_FULL",
    "This recording is too large to keep on this device.",
    { retryable: false },
  )
}
