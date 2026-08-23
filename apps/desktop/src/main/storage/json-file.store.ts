import * as fsp from "node:fs/promises"
import path from "node:path"

import { databaseWriteFailedError } from "../errors/storage"
import type {
  JsonFileFsDeps,
  NoteStorePort,
  StoredNoteRecord,
  StorageLogHook,
} from "./storage.types"

const FILE_VERSION = 1
const LOG_SAVE = "storage.save"
const LOG_REMOVE = "storage.remove"
const LOG_CORRUPT_RESET = "storage.load_corrupt_reset"

type StoreFile = { version: number; records: StoredNoteRecord[] }

export const defaultJsonFileFsDeps: JsonFileFsDeps = {
  readFile(filePath) {
    return fsp.readFile(filePath, "utf8")
  },
  writeFile(filePath, data) {
    return fsp.writeFile(filePath, data, "utf8")
  },
  async exists(filePath) {
    try {
      await fsp.access(filePath)
      return true
    } catch {
      return false
    }
  },
  async mkdir(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true })
  },
  rename(fromPath, toPath) {
    return fsp.rename(fromPath, toPath)
  },
}

function isStoredNoteRecord(value: unknown): value is StoredNoteRecord {
  if (typeof value !== "object" || value === null) return false
  return typeof (value as { id?: unknown }).id === "string"
}

function parseStoreFile(raw: string): StoredNoteRecord[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const candidate = parsed as { version?: unknown; records?: unknown }
  if (candidate.version !== FILE_VERSION || !Array.isArray(candidate.records)) {
    return null
  }
  if (!candidate.records.every(isStoredNoteRecord)) return null
  return candidate.records as StoredNoteRecord[]
}

function serialize(records: readonly StoredNoteRecord[]): string {
  const payload: StoreFile = { version: FILE_VERSION, records: [...records] }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export type CreateJsonFileStoreOptions = {
  onLog?: StorageLogHook
}

export function createJsonFileStore(
  filePath: string,
  fsDeps: JsonFileFsDeps = defaultJsonFileFsDeps,
  options: CreateJsonFileStoreOptions = {},
): NoteStorePort {
  let cache: StoredNoteRecord[] | null = null
  let queue: Promise<unknown> = Promise.resolve()

  const log = (action: string): void => {
    options.onLog?.(action)
  }

  async function loadRecords(): Promise<StoredNoteRecord[]> {
    if (cache !== null) return cache
    let raw = ""
    if (await fsDeps.exists(filePath)) {
      try {
        raw = await fsDeps.readFile(filePath)
      } catch {
        raw = ""
      }
    }
    if (raw === "") {
      cache = []
      return cache
    }
    const parsed = parseStoreFile(raw)
    if (parsed === null) {
      log(LOG_CORRUPT_RESET)
      cache = []
      return cache
    }
    cache = parsed
    return cache
  }

  async function persist(records: readonly StoredNoteRecord[]): Promise<void> {
    const tempPath = `${filePath}.${process.pid}.tmp`
    await fsDeps.mkdir(path.dirname(filePath))
    await fsDeps.writeFile(tempPath, serialize(records))
    await fsDeps.rename(tempPath, filePath)
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  return {
    save(record) {
      return enqueue(async () => {
        const records = [...(await loadRecords())]
        const index = records.findIndex((existing) => existing.id === record.id)
        if (index === -1) {
          records.push(record)
        } else {
          records[index] = record
        }
        try {
          await persist(records)
        } catch (error) {
          throw databaseWriteFailedError(error)
        }
        cache = records
        log(LOG_SAVE)
      })
    },

    list() {
      return enqueue(async () => structuredClone(await loadRecords()))
    },

    get(id) {
      return enqueue(async () => {
        const found = (await loadRecords()).find(
          (record) => record.id === id,
        )
        return found ? structuredClone(found) : null
      })
    },

    remove(id) {
      return enqueue(async () => {
        const records = [...(await loadRecords())]
        const next = records.filter((record) => record.id !== id)
        if (next.length === records.length) return
        try {
          await persist(next)
        } catch (error) {
          throw databaseWriteFailedError(error)
        }
        cache = next
        log(LOG_REMOVE)
      })
    },
  }
}
