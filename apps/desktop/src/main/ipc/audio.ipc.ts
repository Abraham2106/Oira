import { IPC_CHANNELS } from "./channels"
import { appendAudioInputSchema } from "../../shared/schemas/ipc.schema"
import type { AudioTempStore } from "../audio"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerAudioIpc(
  handle: IpcHandle,
  deps: { audio: AudioTempStore; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.APPEND_AUDIO, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.APPEND_AUDIO,
      schema: appendAudioInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        deps.audio.append(
          input.encounterId,
          Buffer.from(input.pcm),
          input.sequence,
        )
        return { accepted: true as const }
      },
    })(raw),
  )
}
