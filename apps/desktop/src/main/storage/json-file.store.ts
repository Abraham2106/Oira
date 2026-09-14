import * as fsp from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

import {
  clinicalNoteSchema,
  transcriptSegmentSchema,
} from "../../shared/schemas/clinical.schema"
import { SECTION_IDS } from "@oira/types"
import {
  databaseReadFailedError,
  databaseWriteFailedError,
} from "../errors/storage"
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

const legacyFieldValueSchema = z.object({
  text: z.string(),
  presence: z.enum(["STATED", "NOT_STATED", "UNKNOWN"]),
  sourceSegmentIds: z.array(z.string()),
  reviewed: z.boolean(),
}).strict()

const legacyClinicalNoteSchema = z.object({
  sections: z.object(Object.fromEntries(
    SECTION_IDS.map((id) => [id, legacyFieldValueSchema]),
  ) as Record<(typeof SECTION_IDS)[number], typeof legacyFieldValueSchema>).strict(),
}).strict().transform((note) => ({
  sections: Object.fromEntries(SECTION_IDS.map((id) => [
    id,
    { ...note.sections[id], provenance: "LEGACY_UNVERIFIED" as const },
  ])) as StoredNoteRecord["note"]["sections"],
}))

const storedNoteRecordSchema = z
  .object({
    id: z.string().min(1),
    encounterId: z.string().min(1),
    acceptedAt: z.string().min(1),
    label: z.string(),
    visitType: z.string(),
    note: z.union([clinicalNoteSchema, legacyClinicalNoteSchema]),
    transcript: z.array(transcriptSegmentSchema),
  })
  .strict()

const storeFileSchema = z
  .object({
    version: z.literal(FILE_VERSION),
    records: z.array(storedNoteRecordSchema),
  })
  .strict()

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

function parseStoreFile(raw: string): StoredNoteRecord[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const result = storeFileSchema.safeParse(parsed)
  if (!result.success) return null
  return result.data.records
}

function serialize(records: readonly StoredNoteRecord[]): string {
  const payload: StoreFile = { version: FILE_VERSION, records: [...records] }
  return `${JSON.stringify(payload, null, 2)}\n`
}

export type CreateJsonFileStoreOptions = {
  onLog?: StorageLogHook
  now?: () => number
}

export function createJsonFileStore(
  filePath: string,
  fsDeps: JsonFileFsDeps = defaultJsonFileFsDeps,
  options: CreateJsonFileStoreOptions = {},
): NoteStorePort {
  let cache: StoredNoteRecord[] | null = null
  let queue: Promise<unknown> = Promise.resolve()
  const now = options.now ?? Date.now

  const log = (action: string): void => {
    options.onLog?.(action)
  }

  async function quarantineCorrupt(): Promise<void> {
    log(LOG_CORRUPT_RESET)
    const quarantinePath = `${filePath}.corrupt-${now()}`
    try {
      await fsDeps.rename(filePath, quarantinePath)
    } catch (error) {
      throw databaseReadFailedError(error)
    }
  }

  async function loadRecords(): Promise<StoredNoteRecord[]> {
    if (cache !== null) return cache
    const exists = await fsDeps.exists(filePath)
    if (!exists) {
      cache = []
      return cache
    }

    let raw: string
    try {
      raw = await fsDeps.readFile(filePath)
    } catch (error) {
      throw databaseReadFailedError(error)
    }

    const parsed = parseStoreFile(raw)
    if (parsed === null) {
      await quarantineCorrupt()
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
        const found = (await loadRecords()).find((record) => record.id === id)
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
