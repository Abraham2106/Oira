import { IPC_CHANNELS } from "./channels"
import { clipboardWriteInputSchema } from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import type { ClipboardPort } from "../ports/outbound"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export type { ClipboardPort }

export function registerClipboardIpc(
  handle: IpcHandle,
  deps: {
    clipboard: ClipboardPort
    session: SessionPort
    logger: IpcLogger
  },
): void {
  handle(IPC_CHANNELS.CLIPBOARD_WRITE, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.CLIPBOARD_WRITE,
      schema: clipboardWriteInputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        // Awaited so a future async clipboard adapter cannot lose errors/races.
        await deps.clipboard.writeText(input.text)
        return { written: true }
      },
    })(raw),
  )
}
