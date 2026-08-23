import { describe, expect, it } from "vitest"
import { isAppError } from "../utils/app-error"
import { createExportService } from "./export.service"
import { createMemoryClipboard } from "./clipboard"
import type { ExportableNote } from "../../shared/types/notes"
import type { DraftNote } from "../../shared/types/notes"
import { bodyForExport } from "./export.service"

const ENCOUNTER_ID = "11111111-1111-4111-8111-111111111111"
const NOTE_ID = "55555555-5555-4555-8555-555555555555"
const DRAFT_ID = "44444444-4444-4444-8444-444444444444"

const approved: ExportableNote = {
  note: {
    kind: "approved",
    id: NOTE_ID,
    encounterId: ENCOUNTER_ID,
    body: "Nota revisada.",
    approvedBy: "local-user",
    approvedAt: "2026-01-01T00:03:00.000Z",
    derivedFromDraftId: DRAFT_ID,
  },
  facts: {},
  model: { name: "mock-structuring", promptVersion: "v1-placeholder" },
}

describe("createExportService", () => {
  it("refuses to export when there is no approved note", async () => {
    const exporter = createExportService({
      getExportable: async () => undefined,
      dialog: { async chooseSavePath() { return "/tmp/n.txt" } },
      clipboard: createMemoryClipboard(),
    })
    await expect(
      exporter.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "EXPORT_FAILED",
    )
  })

  it("writes txt through the save dialog, not a renderer path", async () => {
    const written: { path?: string; contents?: string } = {}
    const exporter = createExportService({
      getExportable: async () => approved,
      dialog: {
        async chooseSavePath({ format }) {
          expect(format).toBe("txt")
          return "C:/exports/nota.txt"
        },
      },
      clipboard: createMemoryClipboard(),
      writeFile: async (filePath, contents) => {
        written.path = filePath
        written.contents = contents
      },
    })
    await expect(
      exporter.exportNote({ encounterId: ENCOUNTER_ID, format: "txt" }),
    ).resolves.toEqual({ exported: true })
    expect(written.path).toBe("C:/exports/nota.txt")
    expect(written.contents).toContain("Nota revisada.")
  })

  it("copies only approved text to the clipboard", async () => {
    const store = { text: "" }
    const exporter = createExportService({
      getExportable: async () => approved,
      dialog: { async chooseSavePath() { return undefined } },
      clipboard: createMemoryClipboard(store),
    })
    await exporter.exportNote({ encounterId: ENCOUNTER_ID, format: "clipboard" })
    expect(store.text).toContain("Nota revisada.")
  })
})

describe("bodyForExport", () => {
  it("rejects a draft", () => {
    const draft: DraftNote = {
      kind: "draft",
      id: DRAFT_ID,
      encounterId: ENCOUNTER_ID,
      facts: {},
      body: "borrador",
      model: { name: "mock", promptVersion: "v1-placeholder" },
      generatedAt: "2026-01-01T00:00:00.000Z",
    }
    expect(() => bodyForExport(draft)).toThrow()
  })
})
