import path from "node:path"

import { createJsonFileStore } from "./json-file.store"
import { createSqliteNoteStore } from "./sqlite.store"
import type { NoteStorePort } from "./storage.types"

export {
  createJsonFileStore,
  defaultJsonFileFsDeps,
  type CreateJsonFileStoreOptions,
} from "./json-file.store"
export { createMemoryNoteStore } from "./memory.store"
export { createSqliteNoteStore, type SqliteNoteStore } from "./sqlite.store"
export type {
  JsonFileFsDeps,
  NoteStorePort,
  StorageLogHook,
  StoredNoteRecord,
} from "./storage.types"

export function createNoteStoreForPath(filePath: string): NoteStorePort {
  if (/\.(sqlite|db)$/i.test(filePath)) return createSqliteNoteStore(filePath)
  return createJsonFileStore(filePath)
}

export function createDefaultNoteStore(paths: {
  userDataDir: string
}): NoteStorePort {
  return createSqliteNoteStore(
    path.join(paths.userDataDir, "notes", "accepted-notes.sqlite"),
  )
}
