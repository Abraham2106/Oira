import { createAppError, type AppError } from "./core"

export function modelNotReadyError(): AppError {
  return createAppError(
    "MODEL_NOT_READY",
    "Local inference is not available in this build.",
    {
      hint: "Set NOTALOCAL_INFERENCE=mock to use fixtures. On-device Whisper is selected with qvac.",
      retryable: false,
    },
  )
}

export function transcriptionFailedError(
  message = "Transcription failed.",
): AppError {
  return createAppError("TRANSCRIPTION_FAILED", message, { retryable: false })
}
