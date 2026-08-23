import type { TranscriptRecord } from "../../../shared/types/transcript"
import type { TranscriptRepository } from "../../../shared/types/repositories"
import type { SqliteDb } from "../db"

type TranscriptRow = {
  id: string
  encounter_id: string
  text: string
  segments_json: string | null
  stt_model: string | null
  created_at: string
}

export function createSqliteTranscriptRepository(db: SqliteDb): TranscriptRepository {
  return {
    async insert(record) {
      db.run(
        `INSERT INTO transcripts (id, encounter_id, text, segments_json, stt_model, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.encounterId,
          record.text,
          JSON.stringify(record.segments),
          record.sttModel,
          new Date().toISOString(),
        ],
      )
    },

    async getByEncounterId(encounterId) {
      const row = db.get<TranscriptRow>(
        `SELECT id, encounter_id, text, segments_json, stt_model, created_at
         FROM transcripts WHERE encounter_id = ? ORDER BY created_at DESC LIMIT 1`,
        [encounterId],
      )
      if (!row) return undefined
      const segments = row.segments_json
        ? (JSON.parse(row.segments_json) as TranscriptRecord["segments"])
        : []
      return {
        id: row.id,
        encounterId: row.encounter_id,
        text: row.text,
        segments,
        sttModel: row.stt_model,
      }
    },

    async deleteByEncounterId(encounterId) {
      db.run("DELETE FROM transcripts WHERE encounter_id = ?", [encounterId])
    },

    async listEncounterIds() {
      return db
        .all<{ encounter_id: string }>(
          "SELECT DISTINCT encounter_id FROM transcripts",
        )
        .map((row) => row.encounter_id)
    },
  }
}
