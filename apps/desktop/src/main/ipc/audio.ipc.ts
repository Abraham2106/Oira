import { IPC_CHANNELS } from "./channels"
import { appendAudioInputSchema } from "../../shared/schemas/ipc.schema"
import type { AudioCapturePort } from "../ports/outbound"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerAudioIpc(
  handle: IpcHandle,
  deps: { audio: AudioCapturePort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.APPEND_AUDIO, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.APPEND_AUDIO,
      schema: appendAudioInputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: async (input) => {
        // Awaited (not fire-and-forget) so a future async adapter surfaces
        // its errors through the Result instead of racing the response.
        await deps.audio.append(
          input.encounterId,
          Buffer.from(input.pcm),
          input.sequence,
        )
        return { accepted: true as const }
      },
    })(raw),
  )
}
