export const IPC_CHANNELS = {
  START_ENCOUNTER: "notalocal:encounters:start",
  STOP_ENCOUNTER: "notalocal:encounters:stop",
  APPEND_AUDIO: "notalocal:audio:append",
  GENERATE_NOTE: "notalocal:notes:generate",
  SAVE_NOTE: "notalocal:notes:save",
  EXPORT_NOTE: "notalocal:export:note",
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
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
