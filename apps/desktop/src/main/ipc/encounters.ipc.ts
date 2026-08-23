import { IPC_CHANNELS } from "./channels"
import {
  discardEncounterInputSchema,
  encounterStatusOutputSchema,
  getEncounterInputSchema,
  getEncounterOutputSchema,
  pushAudioChunkInputSchema,
  pushAudioChunkOutputSchema,
  startEncounterInputSchema,
  startEncounterOutputSchema,
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
      outputSchema: startEncounterOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        const created = await deps.encounters.create()
        return deps.encounters.start(created.id)
      },
    })(raw),
  )

  handle(IPC_CHANNELS.STOP_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.STOP_ENCOUNTER,
      schema: stopEncounterInputSchema,
      outputSchema: encounterStatusOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.stop(input.encounterId),
    })(raw),
  )

  handle(IPC_CHANNELS.GET_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.GET_ENCOUNTER,
      schema: getEncounterInputSchema,
      outputSchema: getEncounterOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.get(input.encounterId),
    })(raw),
  )

  handle(IPC_CHANNELS.DISCARD_ENCOUNTER, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.DISCARD_ENCOUNTER,
      schema: discardEncounterInputSchema,
      outputSchema: encounterStatusOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.encounters.discard(input.encounterId),
    })(raw),
  )

  handle(IPC_CHANNELS.PUSH_AUDIO_CHUNK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.PUSH_AUDIO_CHUNK,
      schema: pushAudioChunkInputSchema,
      outputSchema: pushAudioChunkOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) =>
        deps.encounters.appendChunk(input.encounterId, input.chunk),
    })(raw),
  )
}
