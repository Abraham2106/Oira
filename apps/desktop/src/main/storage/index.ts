import { openDatabase, type SqliteDb } from "./db"
import { runMigrations } from "./migrations/runner"
import { createSqliteEncounterRepository } from "./repositories/encounter.repository"
import { createSqliteNotesRepository } from "./repositories/notes.repository"
import {
  createSqliteSettingsRepository,
  type SettingsRepository,
} from "./repositories/settings.repository"
import { createSqliteTranscriptRepository } from "./repositories/transcript.repository"

export type AppStorage = {
  db: SqliteDb
  encounters: ReturnType<typeof createSqliteEncounterRepository>
  transcripts: ReturnType<typeof createSqliteTranscriptRepository>
  notes: ReturnType<typeof createSqliteNotesRepository>
  settings: ReturnType<typeof createSqliteSettingsRepository>
  close: () => void
}

export const PIN_HASH_SETTING_KEY = "pin.hash"

export function openAppStorage(filePath: string): AppStorage {
  const db = openDatabase(filePath)
  runMigrations(db)
  return {
    db,
    encounters: createSqliteEncounterRepository(db),
    transcripts: createSqliteTranscriptRepository(db),
    notes: createSqliteNotesRepository(db),
    settings: createSqliteSettingsRepository(db),
    close: () => db.close(),
  }
}

export function createSettingsPinStore(settings: SettingsRepository): {
  getSerializedHash: () => Promise<string | undefined>
  setSerializedHash: (value: string) => Promise<void>
} {
  return {
    async getSerializedHash() {
      return settings.get(PIN_HASH_SETTING_KEY)
    },
    async setSerializedHash(value) {
      settings.set(PIN_HASH_SETTING_KEY, value)
    },
  }
}

export { openDatabase } from "./db"
export { runMigrations } from "./migrations/runner"
export { createSqliteEncounterRepository } from "./repositories/encounter.repository"
export { createSqliteTranscriptRepository } from "./repositories/transcript.repository"
export { createSqliteNotesRepository } from "./repositories/notes.repository"
export { createSqliteSettingsRepository } from "./repositories/settings.repository"
export type { SqliteDb } from "./db"
export type { SettingsRepository } from "./repositories/settings.repository"
