import { createRequire } from "node:module"
import { createAppError, isAppError } from "../utils/app-error"

type SqliteStatement = {
  run: (...params: unknown[]) => unknown
  get: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => unknown[]
}

type SqliteDatabaseSync = {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
  close: () => void
}

export type SqliteDb = {
  exec: (sql: string) => void
  run: (sql: string, params?: unknown[]) => void
  get: <T>(sql: string, params?: unknown[]) => T | undefined
  all: <T>(sql: string, params?: unknown[]) => T[]
  transaction: <T>(fn: () => T) => T
  close: () => void
}

function asDatabaseError(error: unknown): never {
  throw createAppError("DATABASE_ERROR", "The database operation failed.", {
    retryable: true,
    cause: error,
  })
}

function loadDatabaseSync(): new (path: string) => SqliteDatabaseSync {
  try {
    const require = createRequire(import.meta.url)
    const sqlite = require("node:sqlite") as {
      DatabaseSync: new (path: string) => SqliteDatabaseSync
    }
    return sqlite.DatabaseSync
  } catch (error) {
    throw createAppError(
      "DATABASE_ERROR",
      "SQLite is not available in this runtime.",
      { retryable: false, cause: error },
    )
  }
}

export function openDatabase(filePath: string): SqliteDb {
  const DatabaseSync = loadDatabaseSync()
  let raw: SqliteDatabaseSync
  try {
    raw = new DatabaseSync(filePath)
    raw.exec("PRAGMA foreign_keys = ON")
  } catch (error) {
    asDatabaseError(error)
  }

  const runInTransaction = <T>(fn: () => T): T => {
    try {
      raw.exec("BEGIN")
    } catch (error) {
      asDatabaseError(error)
    }
    try {
      const result = fn()
      raw.exec("COMMIT")
      return result
    } catch (error) {
      try {
        raw.exec("ROLLBACK")
      } catch {
        // Keep the original failure.
      }
      if (isAppError(error)) throw error
      asDatabaseError(error)
    }
  }

  return {
    exec(sql: string) {
      try {
        raw.exec(sql)
      } catch (error) {
        asDatabaseError(error)
      }
    },
    run(sql: string, params: unknown[] = []) {
      try {
        raw.prepare(sql).run(...params)
      } catch (error) {
        asDatabaseError(error)
      }
    },
    get<T>(sql: string, params: unknown[] = []) {
      try {
        return raw.prepare(sql).get(...params) as T | undefined
      } catch (error) {
        asDatabaseError(error)
      }
    },
    all<T>(sql: string, params: unknown[] = []) {
      try {
        return raw.prepare(sql).all(...params) as T[]
      } catch (error) {
        asDatabaseError(error)
      }
    },
    transaction: runInTransaction,
    close() {
      try {
        raw.close()
      } catch (error) {
        asDatabaseError(error)
      }
    },
  }
}
