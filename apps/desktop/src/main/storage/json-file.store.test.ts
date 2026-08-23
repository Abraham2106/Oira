import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  SECTION_IDS,
  type ClinicalNote,
  type FieldValue,
  type SectionId,
} from "@oira/types"
import { describe, expect, it } from "vitest"

import { createJsonFileStore } from "./json-file.store"
import type { JsonFileFsDeps, StoredNoteRecord } from "./storage.types"

const STORE_PATH = "/store/accepted-notes.json"
const CLINICAL_TEXT = "dolor-toracico-sintetico"

type MemFiles = Map<string, string>

function makeMemFs(
  initial: MemFiles = new Map(),
): { deps: JsonFileFsDeps; files: MemFiles } {
  const files = initial
  return {
    files,
    deps: {
      async readFile(filePath) {
        const content = files.get(filePath)
        if (content === undefined) throw new Error(`ENOENT: ${filePath}`)
        return content
      },
      async writeFile(filePath, data) {
        files.set(filePath, data)
      },
      async exists(filePath) {
        return files.has(filePath)
      },
      async mkdir() {},
      async rename(fromPath, toPath) {
        const content = files.get(fromPath)
        if (content === undefined) throw new Error(`ENOENT: ${fromPath}`)
        files.delete(fromPath)
        files.set(toPath, content)
      },
    },
  }
}

function field(text: string): FieldValue {
  return {
    text,
    presence: "STATED",
    sourceSegmentIds: [],
    reviewed: true,
  }
}

function makeNote(text: string): ClinicalNote {
  const sections = {} as Record<SectionId, FieldValue>
  for (const sectionId of SECTION_IDS) {
    sections[sectionId] = field(`${text} ${sectionId}`)
  }
  return { sections }
}

function makeRecord(id: string, text: string): StoredNoteRecord {
  return {
    id,
    acceptedAt: "2026-08-22T10:00:00.000Z",
    label: `Consulta ${id}`,
    visitType: "Control",
    note: makeNote(text),
    transcript: [
      {
        id: `${id}-seg-1`,
        speaker: "Paciente",
        startMs: 0,
        text: "Llevo tres dias con molestias.",
      },
    ],
  }
}

describe("main/storage/json-file.store", () => {
  it("round-trips save/list/get/remove preserving insertion order", async () => {
    const mem = makeMemFs()
    const store = createJsonFileStore(STORE_PATH, mem.deps)

    const first = makeRecord("enc-1", CLINICAL_TEXT)
    const second = makeRecord("enc-2", CLINICAL_TEXT)
    await store.save(first)
    await store.save(second)

    expect((await store.list()).map((record) => record.id)).toEqual([
      "enc-1",
      "enc-2",
    ])
    expect(await store.get("enc-2")).toEqual(second)
    expect(await store.get("missing")).toBeNull()

    await store.save({ ...first, label: "Consulta editada" })
    expect(await store.list()).toHaveLength(2)
    expect((await store.get("enc-1"))?.label).toBe("Consulta editada")

    await store.remove("enc-1")
    expect((await store.list()).map((record) => record.id)).toEqual(["enc-2"])

    await store.remove("missing")
    expect(await store.list()).toHaveLength(1)
  })

  it("leaves the original file intact when the write fails", async () => {
    const original = makeRecord("enc-1", CLINICAL_TEXT)
    const before = JSON.stringify({
      version: 1,
      records: [original],
    })
    const mem = makeMemFs(new Map([[STORE_PATH, before]]))
    let writeAttempts = 0
    const failingDeps: JsonFileFsDeps = {
      ...mem.deps,
      async writeFile(filePath, data) {
        if (filePath.endsWith(".tmp")) {
          writeAttempts += 1
          throw new Error("EACCES: simulated disk failure")
        }
        await mem.deps.writeFile(filePath, data)
      },
    }

    const store = createJsonFileStore(STORE_PATH, failingDeps)
    await expect(store.save(makeRecord("enc-2", CLINICAL_TEXT))).rejects.toMatchObject(
      { name: "OiraAppError", code: "DATABASE_ERROR" },
    )

    expect(writeAttempts).toBe(1)
    expect(mem.files.get(STORE_PATH)).toBe(before)
    const fresh = createJsonFileStore(STORE_PATH, mem.deps)
    expect((await fresh.list()).map((record) => record.id)).toEqual(["enc-1"])
  })

  it("treats corrupted or wrong-shape files as an empty store and recovers on save", async () => {
    const actions: string[] = []
    const mem = makeMemFs(new Map([[STORE_PATH, "{not valid json"]]))
    const store = createJsonFileStore(STORE_PATH, mem.deps, {
      onLog: (action) => actions.push(action),
    })

    expect(await store.list()).toEqual([])

    const record = makeRecord("enc-1", CLINICAL_TEXT)
    await store.save(record)

    const reread = createJsonFileStore(STORE_PATH, mem.deps)
    expect(await reread.get("enc-1")).toEqual(record)
    expect(actions).toContain("storage.load_corrupt_reset")
  })

  it("logs action names only and never payload content", async () => {
    const actions: string[] = []
    const mem = makeMemFs()
    const store = createJsonFileStore(STORE_PATH, mem.deps, {
      onLog: (action) => actions.push(action),
    })

    await store.save(makeRecord("enc-1", CLINICAL_TEXT))
    await store.list()
    await store.get("enc-1")

    expect(mem.files.get(STORE_PATH)).toContain("sections")
    expect(mem.files.get(STORE_PATH)).toContain(CLINICAL_TEXT)

    await store.remove("enc-1")

    expect(actions).toEqual(["storage.save", "storage.remove"])
    for (const action of actions) {
      expect(action).toMatch(/^storage\.[a-z_]+$/)
    }
    const serializedActions = actions.join("|")
    expect(serializedActions).not.toContain(CLINICAL_TEXT)
    expect(serializedActions).not.toContain("sections")
  })

  it("persists across store instances in a real temp dir and cleans up", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "oira-store-"))
    const file = path.join(dir, "accepted-notes.json")
    try {
      const writer = createJsonFileStore(file)
      const record = makeRecord("enc-9", CLINICAL_TEXT)
      await writer.save(record)

      const reader = createJsonFileStore(file)
      expect(await reader.get("enc-9")).toEqual(record)
      const rawOnDisk = JSON.parse(await readFile(file, "utf8")) as unknown
      expect(rawOnDisk).toMatchObject({
        version: 1,
        records: [{ id: "enc-9" }],
      })

      await reader.remove("enc-9")
      const reopened = createJsonFileStore(file)
      expect(await reopened.list()).toEqual([])
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
