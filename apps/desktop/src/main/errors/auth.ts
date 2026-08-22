import { createAppError, type AppError } from "./core"

/** PIN / local session is not implemented yet (P1 / guide §9). */
export function authNotImplementedError(): AppError {
  return createAppError(
    "NOT_IMPLEMENTED",
    "Local PIN unlock is not available in this build.",
    {
      hint: "Authentication lands with the §9 PIN work; do not fake unlock.",
      retryable: false,
    },
  )
}
