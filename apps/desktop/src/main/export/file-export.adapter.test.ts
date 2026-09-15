import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import type { FileWriterPort } from "../ports"
import { createMemoryNoteStore } from "../storage/memory.store"
import { createSqliteNoteStore } from "../storage/sqlite.store"
import {
  createFileExportAdapter,
  createMemoryFileWriter,
} from "./file-export.adapter"

const ENCOUNTER_ID = "00000000-0000-4000-8000-000000000001"
const EXPORT_DIR = resolve("oira-test-exports")

async function storedNotes() {
  const notes = createMemoryNoteStore()
  await notes.save({
    id: "00000000-0000-4000-8000-000000000002",
    encounterId: ENCOUNTER_ID,
    acceptedAt: "2026-09-11T12:00:00.000Z",
    label: "Consulta sintética",
    visitType: "Control",
    note: syntheticClinicalNote(),
    transcript: [],
  })
  return notes
}

describe("file export adapter", () => {
  it("writes Spanish-formatted text before reporting success", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).resolves.toEqual({ exported: true })
    expect(writer.directories).toContain(EXPORT_DIR)
    expect(writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.txt`))).toContain(
      "Antecedentes relevantes\nNo consta en la consulta.",
    )
  })

  it("writes stable JSON with export metadata", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
      clock: { nowIso: () => "2026-09-11T16:00:00.000Z" },
    })

    await port.exportNote({ encounterId: ENCOUNTER_ID, format: "json" })
    const raw = writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.json`))
    expect(JSON.parse(raw as string)).toMatchObject({
      encounterId: ENCOUNTER_ID,
      exportedAt: "2026-09-11T16:00:00.000Z",
      note: syntheticClinicalNote(),
    })
  })

  it("exports the latest accepted note when historical duplicates exist", async () => {
    const notes = createMemoryNoteStore()
    const first = syntheticClinicalNote()
    const second = syntheticClinicalNote()
    second.sections.clinical_narrative.text = "Contenido B."
    await notes.save({
      id: "00000000-0000-4000-8000-000000000002",
      encounterId: ENCOUNTER_ID,
      acceptedAt: "2026-09-11T12:00:00.000Z",
      label: "",
      visitType: "",
      note: first,
      transcript: [],
    })
    await notes.save({
      id: "00000000-0000-4000-8000-000000000003",
      encounterId: ENCOUNTER_ID,
      acceptedAt: "2026-09-11T13:00:00.000Z",
      label: "",
      visitType: "",
      note: second,
      transcript: [],
    })
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" })

    expect(writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.txt`))).toContain(
      "Contenido B.",
    )
  })

  it("rejects path-like encounter ids before touching the writer", async () => {
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes: createMemoryNoteStore(),
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: "../secret", format: "txt" }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(writer.files.size).toBe(0)
  })

  it("fails when no accepted note belongs to the encounter", async () => {
    const port = createFileExportAdapter({
      notes: createMemoryNoteStore(),
      writer: createMemoryFileWriter(),
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).rejects.toMatchObject({ code: "EXPORT_FAILED" })
  })

  it("wraps writer failures and never reports success", async () => {
    const notes = await storedNotes()
    const writer: FileWriterPort = {
      async writeFile() {
        throw new Error("ENOSPC")
      },
    }
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).rejects.toMatchObject({ code: "EXPORT_FAILED" })
  })

  it("writes a canonical PDF from the accepted note", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await port.exportNote({ encounterId: ENCOUNTER_ID, format: "pdf" })
    const pdf = writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.pdf`))
    expect(pdf).toContain("Esta exportación no es un documento legal firmado.")
    expect(pdf).toContain("No consta en la consulta.")
  })

  it("writes a FHIR document that keeps the accepted section text", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
    })

    await port.exportNote({ encounterId: ENCOUNTER_ID, format: "fhir" })
    const raw = writer.files.get(join(EXPORT_DIR, `${ENCOUNTER_ID}.fhir.json`))
    const bundle = JSON.parse(raw as string) as {
      type: string
      entry: Array<{ resource: { resourceType: string; section?: Array<{ text: { div: string } }> } }>
    }
    expect(bundle.type).toBe("document")
    expect(bundle.entry[0]?.resource.resourceType).toBe("Composition")
    expect(JSON.stringify(bundle)).toContain("No consta en la consulta.")
  })

  it("treats a cancelled save dialog as cancellation, not success", async () => {
    const notes = await storedNotes()
    const writer = createMemoryFileWriter()
    const port = createFileExportAdapter({
      notes,
      writer,
      exportDir: EXPORT_DIR,
      saveDialog: { async choosePath() { return null } },
    })

    await expect(
      port.exportNote({ encounterId: ENCOUNTER_ID, format: "pdf" }),
    ).rejects.toMatchObject({ code: "OPERATION_CANCELLED" })
    expect(writer.files.size).toBe(0)
  })

  it("exports a sqlite note whose Whisper timestamps are fractional milliseconds", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oira-export-sqlite-"))
    const store = createSqliteNoteStore(join(dir, "accepted-notes.sqlite"))
    try {
      await store.save({
        id: "00000000-0000-4000-8000-000000000002",
        encounterId: ENCOUNTER_ID,
        acceptedAt: "2026-09-15T12:00:00.000Z",
        label: "Consulta sintética",
        visitType: "Control",
        note: syntheticClinicalNote(),
        transcript: [
          {
            id: "seg-1",
            speaker: null,
            startMs: 1400.72,
            text: "Consulta sintética.",
          },
        ],
      })
      const writer = createMemoryFileWriter()
      const port = createFileExportAdapter({
        notes: store,
        writer,
        exportDir: join(dir, "out"),
      })
      await expect(
        port.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
      ).resolves.toEqual({ exported: true })
    } finally {
      store.close()
      await rm(dir, { recursive: true, force: true })
    }
  })
})
