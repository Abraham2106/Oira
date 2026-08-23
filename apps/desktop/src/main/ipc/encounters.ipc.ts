import { IPC_CHANNELS } from "./channels"
import {
  startEncounterInputSchema,
  stopEncounterInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { AudioTempStore } from "../audio"
import type { EncounterPort } from "../encounters"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerEncounterIpc(
  handle: IpcHandle,
  deps: {
    encounters: EncounterPort
    session: SessionPort
    logger: IpcLogger
    audio?: AudioTempStore
  },
): void {
  handle(IPC_CHANNELS.START_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.START_ENCOUNTER,
      schema: startEncounterInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        const started = await deps.encounters.start(input)
        deps.audio?.prepare(started.encounterId)
        return started
      },
    })(raw),
  )

  handle(IPC_CHANNELS.STOP_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.STOP_ENCOUNTER,
      schema: stopEncounterInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        const stopped = await deps.encounters.stop(input.encounterId)
        deps.audio?.finalize(input.encounterId)
        return stopped
      },
    })(raw),
  )
}
