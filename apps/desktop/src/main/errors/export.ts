import { createAppError, type AppError } from "./core"

export function exportNotImplementedError(): AppError {
  return createAppError(
    "NOT_IMPLEMENTED",
    "Note export is not available in this build.",
    {
      hint: "Do not report exported:true until a file or clipboard write succeeds.",
      retryable: false,
    },
  )
}

export function exportFailedError(
  cause?: unknown,
  message = "Could not export the note.",
): AppError {
  return createAppError("EXPORT_FAILED", message, {
    retryable: true,
    cause,
  })
}

export function invalidExportInputError(
  message = "The export request was not valid.",
): AppError {
  return createAppError("INVALID_INPUT", message, { retryable: false })
}

export function exportCancelledError(): AppError {
  return createAppError(
    "OPERATION_CANCELLED",
    "The export was cancelled.",
    { retryable: false },
  )
}
