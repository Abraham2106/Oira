export const IPC_CHANNELS = {
  START_ENCOUNTER: "notalocal:encounters:start",
  WARM_TRANSCRIPTION: "notalocal:inference:warm-transcription",
  SETUP_GET_STATUS: "notalocal:setup:get-status",
  SETUP_PROVISION: "notalocal:setup:provision",
  STOP_ENCOUNTER: "notalocal:encounters:stop",
  APPEND_AUDIO: "notalocal:audio:append",
  GENERATE_NOTE: "notalocal:notes:generate",
  RETRY_AUDIO_CLEANUP: "notalocal:notes:retry-audio-cleanup",
  SAVE_NOTE: "notalocal:notes:save",
  EXPORT_NOTE: "notalocal:export:note",
  CLIPBOARD_WRITE: "notalocal:clipboard:write",
  AUTH_UNLOCK: "notalocal:auth:unlock",
  AUTH_LOCK: "notalocal:auth:lock",
  AUTH_GOOGLE_START: "notalocal:auth:google:start",
  AUTH_SIGN_OUT: "notalocal:auth:sign-out",
  AUTH_SESSION_GET: "notalocal:auth:session:get",

  SETTINGS_GET: "notalocal:settings:get",
  SETTINGS_SAVE: "notalocal:settings:save",
} as const

export const IPC_EVENTS = {
  INFERENCE_PROGRESS: "notalocal:inference:progress",
  MODEL_LIFECYCLE: "notalocal:inference:model-lifecycle",
  SETUP_PROGRESS: "notalocal:setup:progress",
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
