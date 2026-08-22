import { createAppError, type AppError } from "./core"

export function noteGenerationNotImplementedError(): AppError {
  return createAppError(
    "NOT_IMPLEMENTED",
    "Draft note generation is not available in this build.",
    {
      hint: "Wire InferencePort / mock structuring before returning ok drafts.",
      retryable: false,
    },
  )
}

export function noteSaveNotImplementedError(): AppError {
  return createAppError(
    "NOT_IMPLEMENTED",
    "Saving an approved note is not available in this build.",
    {
      hint: "Do not invent noteIds or mark notes approved without persistence.",
      retryable: false,
    },
  )
}

export function invalidStructuredOutputError(
  message = "The structured note did not match the required schema.",
): AppError {
  return createAppError("INVALID_STRUCTURED_OUTPUT", message, {
    retryable: true,
  })
}
