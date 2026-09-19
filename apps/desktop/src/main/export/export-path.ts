import { isAbsolute } from "node:path"

import type { PdfRendererPort, SaveDialogPort } from "./pdf-renderer"

/** Max path length accepted for dialog-chosen export targets. */
export const MAX_EXPORT_PATH_LENGTH = 32_767

export function isAbsoluteExportPath(filePath: string): boolean {
  if (typeof filePath !== "string") return false
  if (!isAbsolute(filePath) || filePath.includes("\0")) return false
  if (filePath.length === 0 || filePath.length > MAX_EXPORT_PATH_LENGTH) return false
  return true
}

export type { PdfRendererPort, SaveDialogPort }
