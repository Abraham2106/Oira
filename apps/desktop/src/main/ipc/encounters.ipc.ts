import { IPC_CHANNELS } from "./channels"
import {
  pushAudioChunkInputSchema,
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
      run: () => deps.encounters.start(),
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

  handle(IPC_CHANNELS.PUSH_AUDIO_CHUNK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.PUSH_AUDIO_CHUNK,
      schema: pushAudioChunkInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) =>
        deps.encounters.appendChunk(input.encounterId, input.chunk),
    })(raw),
  )
}
