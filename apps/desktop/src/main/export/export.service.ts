import type { ExportNoteInput } from "../../shared/schemas/ipc.schema"
import { exportNotImplementedError } from "../errors/export"

export type ExportPort = {
  exportNote: (input: ExportNoteInput) => Promise<{ exported: true }>
}

/**
 * Honest stub until I10 writes TXT/JSON locally.
 * Never returns { exported: true } without a side effect.
 */
export function createExportStub(): ExportPort {
  return {
    async exportNote(_input) {
      throw exportNotImplementedError()
    },
  }
}
