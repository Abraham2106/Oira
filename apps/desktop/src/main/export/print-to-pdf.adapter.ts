import { BrowserWindow } from "electron"

import {
  toPrintFillPayload,
  type DocumentProjection,
  type ExportPresentation,
} from "../../shared/clinical-export"
import { PRINT_SHELL } from "./print/print-template"
import type { PdfRendererPort } from "./pdf-renderer"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function createElectronPdfRenderer(): PdfRendererPort {
  return {
    async render(projection: DocumentProjection, presentation: ExportPresentation) {
      const payload = toPrintFillPayload(projection, presentation)
      const window = new BrowserWindow({
        show: false,
        width: 794,
        height: 1123,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      })
      try {
        await window.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(PRINT_SHELL)}`,
        )
        await window.webContents.executeJavaScript(
          `window.__oiraFill(${JSON.stringify(payload)})`,
        )
        return await window.webContents.printToPDF({
          pageSize: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<div></div>",
          footerTemplate:
            `<div style="font-size:9px;width:100%;padding:0 12px;display:flex;justify-content:space-between;color:#444;">` +
            `<span>${escapeHtml(projection.noteId)}</span>` +
            `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        })
      } finally {
        window.destroy()
      }
    },
  }
}
