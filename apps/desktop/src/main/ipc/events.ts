import { BrowserWindow } from "electron"
import { IPC_CHANNELS } from "./channels"
import {
  rendererEventSchema,
  type RendererEvent,
} from "../../shared/schemas/event.schema"

export function emitToRenderer(payload: RendererEvent): void {
  const parsed = rendererEventSchema.safeParse(payload)
  if (!parsed.success) return
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.EVENT, parsed.data)
  }
}
