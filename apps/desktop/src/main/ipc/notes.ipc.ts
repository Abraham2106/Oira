import { IPC_CHANNELS } from "./channels"
import {
  generateNoteInputSchema,
  saveNoteInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { NotesPort } from "../notes"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerNotesIpc(
  handle: IpcHandle,
  deps: { notes: NotesPort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.GENERATE_NOTE, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.GENERATE_NOTE,
      schema: generateNoteInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.notes.generate(input.encounterId),
    })(raw),
  )

  handle(IPC_CHANNELS.SAVE_NOTE, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.SAVE_NOTE,
      schema: saveNoteInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.notes.save(input),
    })(raw),
  )
}
