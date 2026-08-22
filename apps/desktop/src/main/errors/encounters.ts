import { createAppError, type AppError } from "./core"

export function encounterNotFoundError(): AppError {
  return createAppError(
    "INVALID_STATE_TRANSITION",
    "That encounter does not exist.",
    { retryable: false },
  )
}

export function encounterAlreadyActiveError(): AppError {
  return createAppError(
    "INVALID_STATE_TRANSITION",
    "Only one encounter can be recording or transcribing at a time.",
    { retryable: false },
  )
}

export function invalidEncounterTransitionError(): AppError {
  return createAppError(
    "INVALID_STATE_TRANSITION",
    "That encounter action is not allowed in the current state.",
    { retryable: false },
  )
}
