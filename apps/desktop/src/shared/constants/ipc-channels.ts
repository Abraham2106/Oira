export const IPC_CHANNELS = {
  START_ENCOUNTER: "notalocal:encounters:start",
  STOP_ENCOUNTER: "notalocal:encounters:stop",
  GET_ENCOUNTER: "notalocal:encounters:get",
  DISCARD_ENCOUNTER: "notalocal:encounters:discard",
  GENERATE_NOTE: "notalocal:notes:generate",
  SAVE_NOTE: "notalocal:notes:save",
  EXPORT_NOTE: "notalocal:export:note",
  AUTH_UNLOCK: "notalocal:auth:unlock",
  AUTH_LOCK: "notalocal:auth:lock",
  AUTH_SET_PIN: "notalocal:auth:setPin",
  AUTH_STATUS: "notalocal:auth:status",
  PUSH_AUDIO_CHUNK: "notalocal:audio:pushChunk",
  STORAGE_INVENTORY: "notalocal:privacy:inventory",
  EVENT: "notalocal:event",
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
