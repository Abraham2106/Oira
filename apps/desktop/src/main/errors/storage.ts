import { createAppError, type AppError } from "./core"

/**
 * Storage-only codes. Call sites outside `main/storage` (and its repositories)
 * must not throw DATABASE_ERROR — use domain modules or INTERNAL_ERROR instead.
 */
export function databaseError(
  message: string,
  cause?: unknown,
  options?: { retryable?: boolean; hint?: string },
): AppError {
  return createAppError("DATABASE_ERROR", message, {
    retryable: options?.retryable ?? true,
    hint: options?.hint,
    cause,
  })
}

export function databaseWriteFailedError(cause?: unknown): AppError {
  return databaseError("Could not write to the local database.", cause)
}

export function databaseReadFailedError(cause?: unknown): AppError {
  return databaseError("Could not read from the local database.", cause, {
    retryable: true,
  })
}

export function databaseMigrationFailedError(cause?: unknown): AppError {
  return databaseError("Local database migration failed.", cause, {
    retryable: false,
    hint: "Restart the app. If it keeps failing, report the error code only.",
  })
}
