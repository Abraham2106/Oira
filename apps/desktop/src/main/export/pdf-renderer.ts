import type { ExportPresentation } from "../../shared/clinical-export"
import {
  formatPrintDocumentText,
  toPrintFillPayload,
  type DocumentProjection,
} from "../../shared/clinical-export"

export type PdfRendererPort = {
  render: (
    projection: DocumentProjection,
    presentation: ExportPresentation,
  ) => Promise<Buffer>
}

export type SaveDialogPort = {
  choosePath: (input: {
    format: "pdf" | "fhir"
    defaultFileName: string
  }) => Promise<string | null>
}

export function createCanonicalPdfRenderer(): PdfRendererPort {
  return {
    async render(projection, presentation) {
      return Buffer.from(
        formatPrintDocumentText(toPrintFillPayload(projection, presentation)),
        "utf8",
      )
    },
  }
}

export function createExportDirSaveDialog(exportDir: string): SaveDialogPort {
  return {
    async choosePath(input) {
      const { join } = await import("node:path")
      return join(exportDir, input.defaultFileName)
    },
  }
}
