import type { SqliteDb } from "../db"

export type SettingsRepository = {
  get: (key: string) => string | undefined
  set: (key: string, value: string) => void
}

export function createSqliteSettingsRepository(db: SqliteDb): SettingsRepository {
  return {
    get(key) {
      const row = db.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?",
        [key],
      )
      return row?.value
    },
    set(key, value) {
      db.run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, new Date().toISOString()],
      )
    },
  }
}
