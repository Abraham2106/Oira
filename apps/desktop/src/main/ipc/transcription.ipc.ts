import { IPC_CHANNELS } from "./channels"
import {
  cancelTranscriptionInputSchema,
  encounterStatusOutputSchema,
} from "../../shared/schemas/ipc.schema"
import type { EncounterPort } from "../encounters"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerTranscriptionIpc(
  handle: IpcHandle,
  deps: { encounters: EncounterPort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.CANCEL_TRANSCRIPTION, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.CANCEL_TRANSCRIPTION,
      schema: cancelTranscriptionInputSchema,
      outputSchema: encounterStatusOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.cancelTranscription(input.encounterId),
    })(raw),
  )
}
