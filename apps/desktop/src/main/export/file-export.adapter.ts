import * as fsp from "node:fs/promises"
import { dirname, resolve } from "node:path"

import {
  formatNoteAsJson,
  formatNoteAsText,
  toDocumentProjection,
  type ExportAuthorship,
  type ExportPresentation,
} from "../../shared/clinical-export"
import type { ExportNoteInput } from "../../shared/schemas/ipc.schema"
import { isAppError } from "../errors/core"
import {
  exportCancelledError,
  exportFailedError,
  invalidExportInputError,
} from "../errors/export"
import { safeJoin } from "../audio/safe-path"
import { selectCurrentAcceptedNote } from "../storage/current-note"
import type {
  Clock,
  FileWriterPort,
  NoteStorePort,
} from "../ports/outbound"
import type { ExportPort } from "./export.service"
import { isAbsoluteExportPath } from "./export-path"
import {
  createCanonicalPdfRenderer,
  createExportDirSaveDialog,
  type PdfRendererPort,
  type SaveDialogPort,
} from "./pdf-renderer"
import { createFhirBundlePort, type FhirBundlePort } from "./fhir/bundle"

export type FileExportAdapterDeps = {
  notes: NoteStorePort
  writer: FileWriterPort
  exportDir: string
  clock?: Clock
  pdfRenderer?: PdfRendererPort
  fhir?: FhirBundlePort
  saveDialog?: SaveDialogPort
  authorship?: () => ExportAuthorship
}

const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

const ENCOUNTER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const nodeFileWriter: FileWriterPort = {
  async mkdir(dir) {
    await fsp.mkdir(dir, { recursive: true, mode: 0o700 })
  },
  async writeFile(path, contents) {
    // Atomic + private: write to a sibling tmp file with 0600, then rename,
    // so a crash can never leave a half-written clinical export behind.
    const tmp = `${path}.${process.pid}.tmp`
    if (typeof contents === "string") {
      await fsp.writeFile(tmp, contents, { encoding: "utf8", mode: 0o600 })
    } else {
      await fsp.writeFile(tmp, contents, { mode: 0o600 })
    }
    await fsp.rename(tmp, path)
  },
}

export type MemoryFileWriter = FileWriterPort & {
  files: Map<string, string>
  directories: Set<string>
}

export function createMemoryFileWriter(): MemoryFileWriter {
  const files = new Map<string, string>()
  const directories = new Set<string>()

  return {
    files,
    directories,
    async mkdir(dir) {
      directories.add(dir)
    },
    async writeFile(path, contents) {
      files.set(
        path,
        typeof contents === "string" ? contents : Buffer.from(contents).toString("utf8"),
      )
    },
  }
}

function presentationOf(input: ExportNoteInput): ExportPresentation {
  return input.presentation === "soap" ? "soap" : "sections"
}

export function createFileExportAdapter(
  deps: FileExportAdapterDeps,
): ExportPort {
  const clock = deps.clock ?? systemClock
  const pdfRenderer = deps.pdfRenderer ?? createCanonicalPdfRenderer()
  const fhir = deps.fhir ?? createFhirBundlePort()
  const saveDialog = deps.saveDialog ?? createExportDirSaveDialog(deps.exportDir)
  const authorshipOf = deps.authorship ?? (() => ({ exportedBy: null }))

  return {
    async exportNote(input) {
      if (
        typeof input.encounterId !== "string" ||
        !ENCOUNTER_ID.test(input.encounterId)
      ) {
        throw invalidExportInputError()
      }

      const record = selectCurrentAcceptedNote(
        await deps.notes.list(),
        input.encounterId,
      )
      if (!record) {
        throw exportFailedError(
          undefined,
          "No accepted note exists for that encounter.",
        )
      }

      const authorship = authorshipOf()
      const projection = toDocumentProjection(record, authorship)

      try {
        if (input.format === "txt" || input.format === "json") {
          const exportRoot = resolve(deps.exportDir)
          const path = safeJoin(exportRoot, `${input.encounterId}.${input.format}`)
          const contents = input.format === "txt"
            ? formatNoteAsText(record.note)
            : formatNoteAsJson(record.note, {
                encounterId: record.encounterId,
                noteId: record.id,
                acceptedAt: record.acceptedAt,
                exportedAt: clock.nowIso(),
                label: record.label,
                visitType: record.visitType,
              })
          await deps.writer.mkdir?.(exportRoot)
          await deps.writer.writeFile(path, contents)
          return { exported: true }
        }

        if (input.format === "pdf") {
          const path = await saveDialog.choosePath({
            format: "pdf",
            defaultFileName: `${input.encounterId}.pdf`,
          })
          if (!path) throw exportCancelledError()
          if (!isAbsoluteExportPath(path)) throw invalidExportInputError()
          const bytes = await pdfRenderer.render(projection, presentationOf(input))
          await deps.writer.mkdir?.(dirname(path))
          await deps.writer.writeFile(path, bytes)
          return { exported: true }
        }

        const path = await saveDialog.choosePath({
          format: "fhir",
          defaultFileName: `${input.encounterId}.fhir.json`,
        })
        if (!path) throw exportCancelledError()
        if (!isAbsoluteExportPath(path)) throw invalidExportInputError()
        const bundle = fhir.build(projection, authorship)
        await deps.writer.mkdir?.(dirname(path))
        await deps.writer.writeFile(path, `${JSON.stringify(bundle, null, 2)}\n`)
        return { exported: true }
      } catch (error) {
        if (isAppError(error)) throw error
        throw exportFailedError(error)
      }
    },
  }
}
