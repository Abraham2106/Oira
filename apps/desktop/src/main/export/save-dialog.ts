import { dialog } from "electron"

import type { SaveDialogPort } from "./pdf-renderer"

export function createElectronSaveDialog(): SaveDialogPort {
  return {
    async choosePath(input) {
      const filters = input.format === "pdf"
        ? [{ name: "PDF", extensions: ["pdf"] }]
        : [{ name: "FHIR JSON", extensions: ["json"] }]
      const result = await dialog.showSaveDialog({
        defaultPath: input.defaultFileName,
        filters,
      })
      if (result.canceled || !result.filePath) return null
      return result.filePath
    },
  }
}
