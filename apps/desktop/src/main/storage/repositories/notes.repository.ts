import type { StructuredClinicalFacts } from "../../../shared/schemas/clinical.schema"
import { structuredClinicalFactsSchema } from "../../../shared/schemas/clinical.schema"
import type {
  NoteRecord,
  NotesRepository,
  NoteVersionRecord,
} from "../../../shared/types/repositories"
import type { SqliteDb } from "../db"

type NoteRow = {
  id: string
  encounter_id: string
  current_version_id: string | null
  approved_version_id: string | null
  created_at: string
  updated_at: string
}

type VersionRow = {
  id: string
  note_id: string
  kind: string
  body: string
  facts_json: string | null
  model_name: string | null
  prompt_version: string | null
  created_at: string
  encounter_id: string
}

function toNote(row: NoteRow): NoteRecord {
  return {
    id: row.id,
    encounterId: row.encounter_id,
    currentVersionId: row.current_version_id,
    approvedVersionId: row.approved_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseFacts(raw: string | null): StructuredClinicalFacts | null {
  if (!raw) return null
  try {
    const parsed = structuredClinicalFactsSchema.safeParse(
      JSON.parse(raw) as unknown,
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function toVersion(row: VersionRow): NoteVersionRecord {
  return {
    id: row.id,
    noteId: row.note_id,
    encounterId: row.encounter_id,
    kind: row.kind === "approved" ? "approved" : "draft",
    body: row.body,
    facts: parseFacts(row.facts_json),
    modelName: row.model_name,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
  }
}

export function createSqliteNotesRepository(db: SqliteDb): NotesRepository {
  return {
    async getByEncounterId(encounterId) {
      const noteRow = db.get<NoteRow>(
        `SELECT id, encounter_id, current_version_id, approved_version_id, created_at, updated_at
         FROM clinical_notes WHERE encounter_id = ?`,
        [encounterId],
      )
      if (!noteRow) return undefined
      const versionRows = db.all<VersionRow>(
        `SELECT v.id, v.note_id, v.kind, v.body, v.facts_json, v.model_name, v.prompt_version, v.created_at,
                n.encounter_id
         FROM note_versions v
         JOIN clinical_notes n ON n.id = v.note_id
         WHERE n.encounter_id = ?
         ORDER BY v.created_at ASC`,
        [encounterId],
      )
      return {
        note: toNote(noteRow),
        versions: versionRows.map(toVersion),
      }
    },

    async insertNote(note) {
      db.run(
        `INSERT INTO clinical_notes (
           id, encounter_id, current_version_id, approved_version_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.encounterId,
          note.currentVersionId,
          note.approvedVersionId,
          note.createdAt,
          note.updatedAt,
        ],
      )
    },

    async insertVersion(version) {
      db.run(
        `INSERT INTO note_versions (
           id, note_id, kind, body, facts_json, model_name, prompt_version, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          version.id,
          version.noteId,
          version.kind,
          version.body,
          version.facts ? JSON.stringify(version.facts) : null,
          version.modelName,
          version.promptVersion,
          version.createdAt,
        ],
      )
    },

    async updateNote(note) {
      db.run(
        `UPDATE clinical_notes SET
           current_version_id = ?, approved_version_id = ?, updated_at = ?
         WHERE id = ?`,
        [
          note.currentVersionId,
          note.approvedVersionId,
          note.updatedAt,
          note.id,
        ],
      )
    },

    async writeDraft({ note, version, createNote }) {
      db.transaction(() => {
        if (createNote) {
          db.run(
            `INSERT INTO clinical_notes (
               id, encounter_id, current_version_id, approved_version_id, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              note.id,
              note.encounterId,
              note.currentVersionId,
              note.approvedVersionId,
              note.createdAt,
              note.updatedAt,
            ],
          )
        }
        db.run(
          `INSERT INTO note_versions (
             id, note_id, kind, body, facts_json, model_name, prompt_version, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            version.id,
            version.noteId,
            version.kind,
            version.body,
            version.facts ? JSON.stringify(version.facts) : null,
            version.modelName,
            version.promptVersion,
            version.createdAt,
          ],
        )
        db.run(
          `UPDATE clinical_notes SET
             current_version_id = ?, updated_at = ?
           WHERE id = ?`,
          [version.id, version.createdAt, note.id],
        )
      })
    },

    async writeApproved({ note, version }) {
      db.transaction(() => {
        db.run(
          `INSERT INTO note_versions (
             id, note_id, kind, body, facts_json, model_name, prompt_version, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            version.id,
            version.noteId,
            version.kind,
            version.body,
            version.facts ? JSON.stringify(version.facts) : null,
            version.modelName,
            version.promptVersion,
            version.createdAt,
          ],
        )
        db.run(
          `UPDATE clinical_notes SET
             approved_version_id = ?, updated_at = ?
           WHERE id = ?`,
          [version.id, version.createdAt, note.id],
        )
      })
    },

    async deleteByEncounterId(encounterId) {
      db.run("DELETE FROM clinical_notes WHERE encounter_id = ?", [encounterId])
    },

    async listEncounterIds() {
      return db
        .all<{ encounter_id: string }>(
          "SELECT encounter_id FROM clinical_notes",
        )
        .map((row) => row.encounter_id)
    },
  }
}
