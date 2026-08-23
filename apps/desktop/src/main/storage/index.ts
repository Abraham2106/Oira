import path from "node:path"

import { createJsonFileStore } from "./json-file.store"
import type { NoteStorePort } from "./storage.types"

export {
  createJsonFileStore,
  defaultJsonFileFsDeps,
  type CreateJsonFileStoreOptions,
} from "./json-file.store"
export type {
  JsonFileFsDeps,
  NoteStorePort,
  StorageLogHook,
  StoredNoteRecord,
} from "./storage.types"

export function createDefaultNoteStore(paths: {
  userDataDir: string
}): NoteStorePort {
  return createJsonFileStore(
    path.join(paths.userDataDir, "notes", "accepted-notes.json"),
  )
}
