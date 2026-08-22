import { IPC_CHANNELS } from "./channels"
import { exportNoteInputSchema } from "../../shared/schemas/ipc.schema"
import type { ExportPort } from "../export"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerExportIpc(
  handle: IpcHandle,
  deps: { exportNote: ExportPort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.EXPORT_NOTE, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.EXPORT_NOTE,
      schema: exportNoteInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.exportNote.exportNote(input),
    })(raw),
  )
}
