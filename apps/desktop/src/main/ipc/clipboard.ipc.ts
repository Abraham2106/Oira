import { IPC_CHANNELS } from "./channels"
import { clipboardWriteInputSchema } from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export type ClipboardPort = {
  writeText: (text: string) => void
}

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
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        deps.clipboard.writeText(input.text)
        return { written: true }
      },
    })(raw),
  )
}
