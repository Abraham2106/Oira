import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import type { TranscriptionPort } from "../inference/port"
import { mapSttSegments } from "./qvac-transcript-mapper"
type QvacInferenceRuntime = {
  transcribe: (input: { filePath: string }) => Promise<import("./qvac-transcript-mapper").SttSegmentInput[]>
}
type QvacTranscriptionDeps = {
  runtime?: QvacInferenceRuntime
  env?: { OIRA_STT_LOAD_TIMEOUT_MS?: string }
  loadSdk?: () => Promise<unknown>
  onModelLifecycle?: (event: import("../../shared/types/model-lifecycle").ModelLifecycleEvent) => void
}

/**
 * QVAC transcription adapter over a persistent Whisper runtime. The runtime
 * is warmed once and remains loaded until the application shuts down.
 */
export function createQvacTranscription(
  deps: QvacTranscriptionDeps = {},
): TranscriptionPort {
  let runtime = deps.runtime
  let runtimePromise: Promise<QvacInferenceRuntime> | undefined
  return {
    async transcribe(input) {
      if (!input.filePath) throw transcriptionFailedError()
      try {
        try {
          runtime ??= await (runtimePromise ??= (async () => {
            const module = await import("./inference-runtime")
            return module.createQvacInferenceRuntime({
              env: deps.env,
              loadSdk: deps.loadSdk as never,
              onModelLifecycle: deps.onModelLifecycle,
            })
          })())
        } catch (bootError) {
          // Never reuse a rejected boot promise: the next call must retry.
          runtimePromise = undefined
          throw bootError
        }
        const raw = await runtime.transcribe({ filePath: input.filePath })
        return { segments: mapSttSegments(raw) }
      } catch (error) {
        if (isAppError(error)) throw error
        throw transcriptionFailedError(
          error instanceof Error ? error.message : "TRANSCRIPTION_FAILED",
        )
      }
    },
  }
}
