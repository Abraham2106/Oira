import { asSttJob, type SttJob, type SttPort } from "./stt.port"
import type { QvacClient } from "./qvac.client"
import { createAppError } from "../utils/app-error"

/**
 * Our types in, our types out. Does not know what an encounter is.
 */
export function createTranscriptionAdapter(client: QvacClient): SttPort {
  return {
    transcribeFile(filePath): SttJob {
      const requestId = crypto.randomUUID()
      return asSttJob(
        requestId,
        (async () => {
          const modelId = await client.ensureModel("stt")
          const result = await client.runtime().transcribe({
            modelId,
            filePath,
            withTimestamps: true,
          })
          const segments = result.segments.map((segment) => ({
            id: segment.id,
            text: segment.text,
            startMs: segment.startMs,
            endMs: segment.endMs,
          }))
          const last = segments[segments.length - 1]
          return {
            requestId: result.requestId || requestId,
            segments,
            audioDurationMs: last?.endMs ?? 0,
          }
        })(),
      )
    },
    async cancel(cancelId) {
      await client.runtime().cancel(cancelId)
    },
  }
}

export function requireSttReady(client: QvacClient): void {
  if (client.isReady("stt")) return
  throw createAppError("MODEL_NOT_READY", "The speech model is not ready.", {
    retryable: true,
  })
}
