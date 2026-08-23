import { createAppError } from "../utils/app-error"
import type { ModelRole } from "./model.config"

/**
 * Narrow runtime the rest of `qvac/` talks to.
 *
 * When `@qvac/sdk` is added, this file is the **only** allowed import site:
 *   import { loadModel, unloadModel, transcribe, completion, cancel, close } from "@qvac/sdk"
 *
 * Do not invent SDK methods. If a signature is not documented, leave a
 * TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION.
 */
export type QvacTranscribeResult = {
  requestId: string
  text: string
  segments: {
    id: string
    text: string
    startMs: number
    endMs: number
  }[]
}

export type QvacRuntime = {
  /**
   * Maps to documented `loadModel({ modelSrc, modelType, onProgress })`.
   * TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION — reload of an already-loaded
   * modelId and any concurrent-model limit.
   */
  loadModel: (input: {
    role: ModelRole
    modelSrc: string
    modelType: "whisper" | "parakeet" | "llm"
  }) => Promise<string>
  unloadModel: (modelId: string) => Promise<void>
  transcribe: (input: {
    modelId: string
    filePath: string
    withTimestamps: boolean
  }) => Promise<QvacTranscribeResult> & { requestId: string }
  completion: (input: {
    modelId: string
    prompt: string
    transcript: string
  }) => Promise<string>
  cancel: (requestId: string) => Promise<void>
  close: () => Promise<void>
}

export function createUnavailableQvacRuntime(): QvacRuntime {
  const notPackaged = () =>
    createAppError(
      "MODEL_NOT_READY",
      "The local model runtime is not packaged in this build.",
      { retryable: false },
    )

  return {
    async loadModel() {
      throw notPackaged()
    },
    async unloadModel() {
      throw notPackaged()
    },
    transcribe() {
      throw notPackaged()
    },
    async completion() {
      throw notPackaged()
    },
    async cancel() {},
    async close() {},
  }
}
