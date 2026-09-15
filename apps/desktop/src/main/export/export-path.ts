import { isAbsolute } from "node:path"

import type { PdfRendererPort, SaveDialogPort } from "./pdf-renderer"

export function isAbsoluteExportPath(filePath: string): boolean {
  return isAbsolute(filePath) && !filePath.includes("\0")
}

export type { PdfRendererPort, SaveDialogPort }
