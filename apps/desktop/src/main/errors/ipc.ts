import { createAppError, isAppError, type AppError } from "./core"

/** Zod / payload rejected at the IPC door. */
export function invalidInputError(
  message = "The request was not valid.",
): AppError {
  return createAppError("INVALID_INPUT", message, { retryable: false })
}

/** Channel requires an authenticated session. */
export function notAuthenticatedError(
  message = "Sign in to continue.",
): AppError {
  return createAppError("NOT_AUTHENTICATED", message, { retryable: false })
}

/** IPC must originate in the trusted top-level renderer document. */
export function ipcSenderUnauthorizedError(): AppError {
  return createAppError(
    "IPC_SENDER_UNAUTHORIZED",
    "The request did not originate from the trusted application window.",
    { retryable: false },
  )
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
