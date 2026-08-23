import type { QvacRuntime, QvacTranscribeResult } from "../../main/qvac/qvac.sdk"
import { createAppError } from "../../main/utils/app-error"

/**
 * Imitates documented QVAC signatures without importing `@qvac/sdk`.
 * Used by unit/integration tests. Never loaded in the Renderer.
 */
export function createQvacRuntimeMock(options?: {
  transcriptText?: string
  completionRaw?: string
  failLoad?: boolean
}): QvacRuntime {
  const loaded = new Set<string>()
  return {
    async loadModel({ role, modelSrc }) {
      if (options?.failLoad) {
        throw createAppError("MODEL_NOT_READY", "Mock model refused to load.", {
          retryable: true,
        })
      }
      const modelId = `mock:${role}:${modelSrc}`
      loaded.add(modelId)
      return modelId
    },
    async unloadModel(modelId) {
      loaded.delete(modelId)
    },
    transcribe({ filePath, withTimestamps }) {
      const requestId = "mock-request"
      const work = Promise.resolve({
        requestId,
        text: options?.transcriptText ?? "[mock transcript]",
        segments: withTimestamps
          ? [
              {
                id: "seg-mock",
                text: options?.transcriptText ?? "[mock transcript]",
                startMs: 0,
                endMs: 1000,
              },
            ]
          : [],
      } satisfies QvacTranscribeResult)
      return Object.assign(work, { requestId, filePath })
    },
    async completion() {
      return options?.completionRaw ?? "{}"
    },
    async cancel() {},
    async close() {
      loaded.clear()
    },
  }
}
