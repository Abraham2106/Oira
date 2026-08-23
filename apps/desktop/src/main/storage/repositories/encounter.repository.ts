import {
  ACTIVE_ENCOUNTER_STATUSES,
  ENCOUNTER_STATUSES,
  isActiveEncounterStatus,
  type EncounterStatus,
} from "../../../shared/constants/encounter-status"
import type { EncounterRecord } from "../../encounters/encounter.types"
import type { EncounterRepository } from "../../encounters/encounter.repository"
import type { SqliteDb } from "../db"

type EncounterRow = {
  id: string
  status: string
  created_at: string
  started_at: string | null
  ended_at: string | null
  completed_at: string | null
  updated_at: string
  audio_dir: string | null
  audio_deleted_at: string | null
  duration_ms: number | null
  transcript_id: string | null
}

function isEncounterStatus(value: string): value is EncounterStatus {
  return (ENCOUNTER_STATUSES as readonly string[]).includes(value)
}

function toRecord(row: EncounterRow): EncounterRecord {
  if (!isEncounterStatus(row.status)) {
    throw new Error(`Invalid encounter status: ${row.status}`)
  }
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    transcriptId: row.transcript_id,
  }
}

const SELECT = `
  SELECT e.id, e.status, e.created_at, e.started_at, e.ended_at, e.completed_at,
         e.updated_at, e.audio_dir, e.audio_deleted_at, e.duration_ms,
         (
           SELECT t.id FROM transcripts t
           WHERE t.encounter_id = e.id
           ORDER BY t.created_at DESC
           LIMIT 1
         ) AS transcript_id
  FROM encounters e
`

export function createSqliteEncounterRepository(db: SqliteDb): EncounterRepository {
  return {
    async insert(record) {
      db.run(
        `INSERT INTO encounters (
           id, status, created_at, started_at, ended_at, completed_at, updated_at,
           audio_dir, audio_deleted_at, duration_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
        [
          record.id,
          record.status,
          record.createdAt,
          record.startedAt,
          record.endedAt,
          record.completedAt,
          record.updatedAt,
        ],
      )
    },

    async getById(id) {
      const row = db.get<EncounterRow>(`${SELECT} WHERE e.id = ?`, [id])
      return row ? toRecord(row) : undefined
    },

    async update(record) {
      db.run(
        `UPDATE encounters SET
           status = ?, started_at = ?, ended_at = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          record.status,
          record.startedAt,
          record.endedAt,
          record.completedAt,
          record.updatedAt,
          record.id,
        ],
      )
    },

    async findActive() {
      const placeholders = ACTIVE_ENCOUNTER_STATUSES.map(() => "?").join(", ")
      const row = db.get<EncounterRow>(
        `${SELECT} WHERE e.status IN (${placeholders}) LIMIT 1`,
        [...ACTIVE_ENCOUNTER_STATUSES],
      )
      if (!row) return undefined
      const record = toRecord(row)
      return isActiveEncounterStatus(record.status) ? record : undefined
    },

    async list() {
      return db.all<EncounterRow>(SELECT).map(toRecord)
    },

    async delete(id) {
      db.run("DELETE FROM encounters WHERE id = ?", [id])
    },
  }
}
