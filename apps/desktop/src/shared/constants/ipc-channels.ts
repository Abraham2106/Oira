export const IPC_CHANNELS = {
  START_ENCOUNTER: "notalocal:encounters:start",
  STOP_ENCOUNTER: "notalocal:encounters:stop",
  GENERATE_NOTE: "notalocal:notes:generate",
  SAVE_NOTE: "notalocal:notes:save",
  EXPORT_NOTE: "notalocal:export:note",
  AUTH_UNLOCK: "notalocal:auth:unlock",
  AUTH_LOCK: "notalocal:auth:lock",
  PUSH_AUDIO_CHUNK: "notalocal:audio:pushChunk",
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
