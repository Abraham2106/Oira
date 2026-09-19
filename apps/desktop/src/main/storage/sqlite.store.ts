import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { z } from "zod"

import {
  clinicalNoteSchema,
  transcriptSegmentSchema,
} from "../../shared/schemas/clinical.schema"
import { isAppError } from "../errors/core"
import {
  databaseReadFailedError,
  databaseWriteFailedError,
} from "../errors/storage"
import type { NoteStorePort, StoredNoteRecord } from "./storage.types"

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS accepted_notes (
  id TEXT PRIMARY KEY NOT NULL,
  encounter_id TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  visit_type TEXT NOT NULL DEFAULT '',
  note_json TEXT NOT NULL,
  transcript_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accepted_notes_encounter
  ON accepted_notes (encounter_id);
`

const recordRowSchema = z.object({
  id: z.string().min(1),
  encounter_id: z.string().min(1),
  accepted_at: z.string().min(1),
  label: z.string(),
  visit_type: z.string(),
  note_json: z.string().min(1),
  transcript_json: z.string(),
})

export type SqliteNoteStore = NoteStorePort & {
  close: () => void
}

export function createSqliteNoteStore(filePath: string): SqliteNoteStore {
  mkdirSync(dirname(filePath), { recursive: true })
  let db: DatabaseSync
  try {
    db = new DatabaseSync(filePath)
    db.exec(INIT_SQL)
  } catch (error) {
    throw databaseReadFailedError(error)
  }

  let queue: Promise<unknown> = Promise.resolve()
  let closed = false
  function enqueue<T>(task: () => T): Promise<T> {
    const run = queue.then(task, task)
    queue = run.then(() => undefined, () => undefined)
    return run
  }

  function parseRowOrThrow(raw: unknown, context: string): StoredNoteRecord {
    const parsed = parseRow(raw)
    if (!parsed) throw databaseReadFailedError(`${context}: corrupt note row`)
    return parsed
  }

  function parseRow(raw: unknown): StoredNoteRecord | null {
    const row = recordRowSchema.safeParse(raw)
    if (!row.success) return null
    let noteJson: unknown
    let transcriptJson: unknown
    try {
      noteJson = JSON.parse(row.data.note_json)
      transcriptJson = JSON.parse(row.data.transcript_json)
    } catch {
      return null
    }
    const note = clinicalNoteSchema.safeParse(noteJson)
    const transcript = z.array(transcriptSegmentSchema).safeParse(transcriptJson)
    if (!note.success || !transcript.success) return null
    return {
      id: row.data.id,
      encounterId: row.data.encounter_id,
      acceptedAt: row.data.accepted_at,
      label: row.data.label,
      visitType: row.data.visit_type,
      note: note.data,
      transcript: transcript.data,
    }
  }

  return {
    save(record) {
      return enqueue(() => {
        try {
          db.prepare(
            `INSERT INTO accepted_notes (
              id, encounter_id, accepted_at, label, visit_type, note_json, transcript_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              encounter_id = excluded.encounter_id,
              accepted_at = excluded.accepted_at,
              label = excluded.label,
              visit_type = excluded.visit_type,
              note_json = excluded.note_json,
              transcript_json = excluded.transcript_json`,
          ).run(
            record.id,
            record.encounterId,
            record.acceptedAt,
            record.label,
            record.visitType,
            JSON.stringify(record.note),
            JSON.stringify(record.transcript),
          )
        } catch (error) {
          throw databaseWriteFailedError(error)
        }
      })
    },

    list() {
      return enqueue(() => {
        try {
          const rows = db.prepare(
            "SELECT id, encounter_id, accepted_at, label, visit_type, note_json, transcript_json FROM accepted_notes ORDER BY accepted_at ASC, id ASC",
          ).all()
          // Fail loudly on a corrupt row: silently dropping an accepted
          // clinical note is worse than surfacing a read error.
          return rows.map((row) => structuredClone(parseRowOrThrow(row, "list")))
        } catch (error) {
          if (isAppError(error)) throw error
          throw databaseReadFailedError(error)
        }
      })
    },

    get(id) {
      return enqueue(() => {
        try {
          const row = db.prepare(
            "SELECT id, encounter_id, accepted_at, label, visit_type, note_json, transcript_json FROM accepted_notes WHERE id = ?",
          ).get(id)
          if (!row) return null
          return structuredClone(parseRowOrThrow(row, "get"))
        } catch (error) {
          if (isAppError(error)) throw error
          throw databaseReadFailedError(error)
        }
      })
    },

    remove(id) {
      return enqueue(() => {
        try {
          db.prepare("DELETE FROM accepted_notes WHERE id = ?").run(id)
        } catch (error) {
          throw databaseWriteFailedError(error)
        }
      })
    },

    close() {
      if (closed) return
      closed = true
      db.close()
    },
  }
}
