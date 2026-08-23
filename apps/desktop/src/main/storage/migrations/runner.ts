import type { SqliteDb } from "../db"
import { MIGRATION_001_INIT } from "./001_init"

const MIGRATIONS: { id: string; sql: string }[] = [
  { id: "001_init", sql: MIGRATION_001_INIT },
]

export function runMigrations(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const applied = new Set(
    db.all<{ id: string }>("SELECT id FROM schema_migrations").map((row) => row.id),
  )

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue
    db.transaction(() => {
      db.exec(migration.sql)
      db.run("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)", [
        migration.id,
        new Date().toISOString(),
      ])
    })
  }
}
