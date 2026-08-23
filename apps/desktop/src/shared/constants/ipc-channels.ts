export const IPC_CHANNELS = {
  START_ENCOUNTER: "oira:encounters:start",
  STOP_ENCOUNTER: "oira:encounters:stop",
  GENERATE_NOTE: "oira:notes:generate",
  SAVE_NOTE: "oira:notes:save",
  EXPORT_NOTE: "oira:export:note",
  AUTH_UNLOCK: "oira:auth:unlock",
  AUTH_LOCK: "oira:auth:lock",
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
