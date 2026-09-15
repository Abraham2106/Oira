import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { sentinelClinicalNote } from "../../shared/fixtures/sentinel-consult"
import { createSqliteNoteStore } from "./sqlite.store"
import type { StoredNoteRecord } from "./storage.types"

const ENCOUNTER_ID = "00000000-0000-4000-8000-000000000001"

function record(overrides: Partial<StoredNoteRecord> = {}): StoredNoteRecord {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    encounterId: ENCOUNTER_ID,
    acceptedAt: "2026-09-15T12:00:00.000Z",
    label: "Consulta demo",
    visitType: "Control",
    note: sentinelClinicalNote(),
    transcript: [],
    ...overrides,
  }
}

describe("sqlite note store", () => {
  it("saves, lists, gets and updates an accepted note", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oira-sqlite-"))
    const store = createSqliteNoteStore(join(dir, "notes", "accepted-notes.sqlite"))
    try {
      const first = record()
      await store.save(first)
      expect(await store.get(first.id)).toEqual(first)
      const listed = await store.list()
      expect(listed).toHaveLength(1)
      expect(listed[0]?.note.sections.visit_context.text).toContain("36.8 °C")

      const updated = record({
        acceptedAt: "2026-09-15T13:00:00.000Z",
        label: "Actualizada",
      })
      await store.save(updated)
      expect(await store.get(first.id)).toMatchObject({
        label: "Actualizada",
        acceptedAt: "2026-09-15T13:00:00.000Z",
      })
      expect((await store.list()).map((row) => row.id)).toEqual([first.id])

      await store.remove(first.id)
      expect(await store.get(first.id)).toBeNull()
      expect(await store.list()).toEqual([])
    } finally {
      store.close()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("creates the notes directory when it does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oira-sqlite-mkdir-"))
    const nested = join(dir, "missing", "accepted-notes.sqlite")
    await mkdir(join(dir, "missing"), { recursive: true })
    const store = createSqliteNoteStore(nested)
    try {
      await store.save(record())
      expect(await store.list()).toHaveLength(1)
    } finally {
      store.close()
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("lists a note whose transcript has fractional Whisper timestamps", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oira-sqlite-float-"))
    const file = join(dir, "accepted-notes.sqlite")
    const store = createSqliteNoteStore(file)
    try {
      await store.save(
        record({
          transcript: [
            {
              id: "seg-1",
              speaker: null,
              startMs: 1400.72,
              text: "Consulta sintética.",
            },
          ],
        }),
      )
      const listed = await store.list()
      expect(listed).toHaveLength(1)
      expect(listed[0]?.transcript[0]?.startMs).toBe(1401)
    } finally {
      store.close()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
