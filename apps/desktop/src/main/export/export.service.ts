import type { ExportNoteInput } from "../../shared/schemas/ipc.schema"

export type ExportPort = {
  exportNote: (input: ExportNoteInput) => Promise<{ exported: true }>
}

export function createExportStub(): ExportPort {
  return {
    async exportNote() {
      return { exported: true }
    },
  }
}
