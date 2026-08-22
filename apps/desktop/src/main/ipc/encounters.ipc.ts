import { IPC_CHANNELS } from "./channels"
import {
  startEncounterInputSchema,
  stopEncounterInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { EncounterPort } from "../encounters"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerEncounterIpc(
  handle: IpcHandle,
  deps: { encounters: EncounterPort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.START_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.START_ENCOUNTER,
      schema: startEncounterInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.start(input),
    })(raw),
  )

  handle(IPC_CHANNELS.STOP_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.STOP_ENCOUNTER,
      schema: stopEncounterInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.stop(input.encounterId),
    })(raw),
  )
}
