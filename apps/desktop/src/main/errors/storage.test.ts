import { describe, expect, it } from "vitest"
import {
  databaseMigrationFailedError,
  databaseReadFailedError,
  databaseWriteFailedError,
} from "./storage"

describe("errors/storage", () => {
  it("reserves DATABASE_ERROR for storage failures only", () => {
    expect(databaseWriteFailedError().code).toBe("DATABASE_ERROR")
    expect(databaseReadFailedError().code).toBe("DATABASE_ERROR")
    expect(databaseMigrationFailedError(new Error("pragma")).code).toBe(
      "DATABASE_ERROR",
    )
    expect(databaseMigrationFailedError().retryable).toBe(false)
  })
})
