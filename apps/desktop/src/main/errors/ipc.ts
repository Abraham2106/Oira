import { createAppError, isAppError, type AppError } from "./core"

/** Zod / payload rejected at the IPC door. */
export function invalidInputError(
  message = "The request was not valid.",
): AppError {
  return createAppError("INVALID_INPUT", message, { retryable: false })
}

/** Channel requires an unlocked session. */
export function notAuthenticatedError(
  message = "Unlock the app to continue.",
): AppError {
  return createAppError("NOT_AUTHENTICATED", message, { retryable: false })
}

/**
 * Catch-all at the IPC boundary for non-AppError throws.
 * Must never claim DATABASE_ERROR — that code is reserved for storage.
 */
export function internalError(
  cause?: unknown,
  message = "The operation failed.",
): AppError {
  return createAppError("INTERNAL_ERROR", message, {
    retryable: true,
    cause,
  })
}

/** Map any thrown value to a branded AppError for Result serialization. */
export function toAppError(error: unknown): AppError {
  return isAppError(error) ? error : internalError(error)
}
