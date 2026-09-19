import { IPC_CHANNELS } from "./channels"
import { warmTranscriptionInputSchema } from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import type { InferenceRuntimePort } from "../inference/port"
import { modelNotReadyError } from "../errors/inference"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

/** Starts Whisper warm-up without opening a microphone or creating an encounter. */
export function registerInferenceIpc(
  handle: IpcHandle,
  deps: { inferenceRuntime?: InferenceRuntimePort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.WARM_TRANSCRIPTION, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.WARM_TRANSCRIPTION,
      schema: warmTranscriptionInputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        // Never report a warm-up that did not happen: without a runtime the
        // renderer would open the recorder believing Whisper is ready.
        if (!deps.inferenceRuntime) throw modelNotReadyError()
        await deps.inferenceRuntime.warmTranscription()
        return { warmed: true as const }
      },
    })(raw),
  )
}
