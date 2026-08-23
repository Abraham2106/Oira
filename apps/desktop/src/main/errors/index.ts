export {
  APP_ERROR_NAME,
  createAppError,
  isAppError,
  toSerializableError,
} from "./core"
export type { AppError, CreateAppErrorOptions } from "./core"
export {
  internalError,
  invalidInputError,
  notAuthenticatedError,
  toAppError,
} from "./ipc"
export { authNotImplementedError } from "./auth"
export {
  invalidStructuredOutputError,
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "./notes"
export { modelNotReadyError, transcriptionFailedError } from "./inference"
export {
  audioCaptureFailedError,
  audioFormatUnsupportedError,
  audioTooLargeError,
  pathTraversalBlockedError,
} from "./audio"
export { exportFailedError, exportNotImplementedError } from "./export"
export {
  encounterAlreadyActiveError,
  encounterNotFoundError,
  invalidEncounterTransitionError,
} from "./encounters"
export {
  databaseError,
  databaseMigrationFailedError,
  databaseReadFailedError,
  databaseWriteFailedError,
} from "./storage"
