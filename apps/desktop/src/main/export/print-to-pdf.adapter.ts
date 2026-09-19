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

const PDF_RENDER_TIMEOUT_MS = 60_000

async function withPdfTimeout<T>(task: Promise<T>, step: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`PDF_RENDER_TIMEOUT:${step}`)), PDF_RENDER_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
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
        await withPdfTimeout(window.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(PRINT_SHELL)}`,
        ), "load")
        await withPdfTimeout(window.webContents.executeJavaScript(
          `window.__oiraFill(${JSON.stringify(payload)})`,
        ), "fill")
        return await withPdfTimeout(window.webContents.printToPDF({
          pageSize: "A4",
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: "<div></div>",
          footerTemplate:
            `<div style="font-size:9px;width:100%;padding:0 12px;display:flex;justify-content:space-between;color:#444;">` +
            `<span>${escapeHtml(projection.noteId)}</span>` +
            `<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        }), "print")
      } finally {
        window.destroy()
      }
    },
  }
}
