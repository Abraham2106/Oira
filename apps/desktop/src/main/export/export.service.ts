import { writeFile } from "node:fs/promises"
import { approvedNoteSchema } from "../../shared/schemas/notes.schema"
import type { ExportNoteInput } from "../../shared/schemas/ipc.schema"
import type { ApprovedNote, ExportableNote } from "../../shared/types/notes"
import { isApprovedNote } from "../../shared/types/notes"
import { createAppError } from "../utils/app-error"
import type { ClipboardPort } from "./clipboard"
import { formatNoteJson } from "./formatters/json"
import { formatNoteTxt } from "./formatters/txt"

export type ExportPort = {
  exportNote: (input: ExportNoteInput) => Promise<{ exported: true }>
}

export type SaveDialogPort = {
  chooseSavePath: (input: {
    format: "txt" | "json"
  }) => Promise<string | undefined>
}

export function bodyForExport(note: ApprovedNote | { kind: string; body: string }): string {
  if (!isApprovedNote(note as ApprovedNote)) {
    throw createAppError(
      "EXPORT_FAILED",
      "Only an approved note can be exported.",
      { retryable: false },
    )
  }
  return note.body
}

export type ExportServiceDeps = {
  getExportable: (encounterId: string) => Promise<ExportableNote | undefined>
  dialog: SaveDialogPort
  clipboard: ClipboardPort
  writeFile?: (filePath: string, contents: string) => Promise<void>
}

export function createExportService(deps: ExportServiceDeps): ExportPort {
  const write =
    deps.writeFile ??
    ((filePath: string, contents: string) => writeFile(filePath, contents, "utf8"))

  return {
    async exportNote(input) {
      const payload = await deps.getExportable(input.encounterId)
      if (!payload) {
        throw createAppError(
          "EXPORT_FAILED",
          "There is no approved note to export.",
          { retryable: false },
        )
      }
      const note = approvedNoteSchema.parse(payload.note)
      if (input.format === "clipboard") {
        deps.clipboard.writeText(formatNoteTxt(note))
        return { exported: true as const }
      }

      const contents =
        input.format === "json"
          ? formatNoteJson({
              note,
              facts: payload.facts,
              model: payload.model,
            })
          : formatNoteTxt(note)

      const filePath = await deps.dialog.chooseSavePath({ format: input.format })
      if (!filePath) {
        throw createAppError(
          "OPERATION_CANCELLED",
          "The export was cancelled.",
          { retryable: true },
        )
      }
      await write(filePath, contents)
      return { exported: true as const }
    },
  }
}
