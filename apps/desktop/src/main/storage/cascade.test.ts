import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { openDatabase } from "./db"
import { runMigrations } from "./migrations/runner"

const ENCOUNTER = "11111111-1111-4111-8111-111111111111"
const TRANSCRIPT = "22222222-2222-4222-8222-222222222222"
const NOTE = "33333333-3333-4333-8333-333333333333"
const VERSION = "44444444-4444-4444-8444-444444444444"

describe("sqlite cascade", () => {
  it("enables foreign keys and deletes transcript/notes with the encounter", async () => {
      const dir = await mkdtemp(join(tmpdir(), "notalocal-cascade-"))
      const db = openDatabase(join(dir, "app.sqlite"))
      try {
        runMigrations(db)
        const fk = db.get<{ foreign_keys: number }>("PRAGMA foreign_keys")
        expect(fk?.foreign_keys).toBe(1)

        const encounterCols = db.all<{ name: string; type: string }>(
          "PRAGMA table_info(encounters)",
        )
        expect(encounterCols.some((col) => col.type.toUpperCase() === "BLOB")).toBe(
          false,
        )

        db.run(
          `INSERT INTO encounters (
             id, status, created_at, started_at, ended_at, completed_at, updated_at,
             audio_dir, audio_deleted_at, duration_ms
           ) VALUES (?, 'transcribed', '2026-01-01T00:00:00.000Z', NULL, NULL, NULL,
                     '2026-01-01T00:00:00.000Z', '/tmp-audio/x', NULL, NULL)`,
          [ENCOUNTER],
        )
        db.run(
          `INSERT INTO transcripts (id, encounter_id, text, segments_json, stt_model, created_at)
           VALUES (?, ?, 'texto', '[]', 'whisper', '2026-01-01T00:00:00.000Z')`,
          [TRANSCRIPT, ENCOUNTER],
        )
        db.run(
          `INSERT INTO clinical_notes (
             id, encounter_id, current_version_id, approved_version_id, created_at, updated_at
           ) VALUES (?, ?, NULL, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
          [NOTE, ENCOUNTER],
        )
        db.run(
          `INSERT INTO note_versions (
             id, note_id, kind, body, facts_json, model_name, prompt_version, created_at
           ) VALUES (?, ?, 'draft', 'borrador', '{}', 'mock', 'v1-placeholder',
                     '2026-01-01T00:00:00.000Z')`,
          [VERSION, NOTE],
        )

        db.run("DELETE FROM encounters WHERE id = ?", [ENCOUNTER])

        expect(
          db.get("SELECT id FROM transcripts WHERE encounter_id = ?", [ENCOUNTER]),
        ).toBeUndefined()
        expect(
          db.get("SELECT id FROM clinical_notes WHERE encounter_id = ?", [ENCOUNTER]),
        ).toBeUndefined()
        expect(
          db.get("SELECT id FROM note_versions WHERE note_id = ?", [NOTE]),
        ).toBeUndefined()
      } finally {
        db.close()
      }
  })
})
