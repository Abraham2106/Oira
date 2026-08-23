import { readFile } from "node:fs/promises"
import { assertWavFile, wavDataDurationMs } from "../audio/audio.format"
import { createAppError } from "../utils/app-error"
import type { ModelRole } from "./model.config"
import { DEFAULT_MODEL_CONFIG } from "./model.config"
import type { QvacRuntime, QvacTranscribeResult } from "./qvac.sdk"
import { createUnavailableQvacRuntime } from "./qvac.sdk"

export type QvacClient = {
  ensureModel: (role: ModelRole) => Promise<string>
  isReady: (role: ModelRole) => boolean
  unload: (role: ModelRole) => Promise<void>
  runtime: () => QvacRuntime
  close: () => Promise<void>
}

export type QvacClientDeps = {
  runtime?: QvacRuntime
  modelSrc?: Partial<Record<ModelRole, string | null>>
  allowConcurrentModels?: boolean
}

export function createQvacClient(deps: QvacClientDeps = {}): QvacClient {
  const runtime = deps.runtime ?? createUnavailableQvacRuntime()
  const loaded = new Map<ModelRole, string>()
  const inflight = new Map<ModelRole, Promise<string>>()

  const srcFor = (role: ModelRole) =>
    deps.modelSrc?.[role] ?? DEFAULT_MODEL_CONFIG[role].modelSrc

  return {
    isReady(role) {
      return loaded.has(role)
    },

    runtime: () => runtime,

    async ensureModel(role) {
      const existing = loaded.get(role)
      if (existing) return existing
      const pending = inflight.get(role)
      if (pending) return pending

      const work = (async () => {
        const modelSrc = srcFor(role)
        if (!modelSrc) {
          throw createAppError(
            "MODEL_NOT_READY",
            "No model is configured for this role.",
            { retryable: false },
          )
        }
        if (!deps.allowConcurrentModels) {
          const other: ModelRole = role === "stt" ? "structuring" : "stt"
          const otherId = loaded.get(other)
          if (otherId) {
            await runtime.unloadModel(otherId)
            loaded.delete(other)
          }
        }
        const modelId = await runtime.loadModel({
          role,
          modelSrc,
          modelType: DEFAULT_MODEL_CONFIG[role].modelType,
        })
        loaded.set(role, modelId)
        return modelId
      })()

      inflight.set(role, work)
      try {
        return await work
      } finally {
        inflight.delete(role)
      }
    },

    async unload(role) {
      const modelId = loaded.get(role)
      if (!modelId) return
      await runtime.unloadModel(modelId)
      loaded.delete(role)
    },

    async close() {
      for (const role of [...loaded.keys()]) {
        await this.unload(role)
      }
      await runtime.close()
    },
  }
}

/** Offline stand-in used until `@qvac/sdk` is wired in qvac.sdk.ts. No encounter ids. */
export function createOfflineQvacRuntime(): QvacRuntime {
  const loaded = new Set<string>()
  return {
    async loadModel({ role, modelSrc }) {
      const modelId = `${role}:${modelSrc}`
      loaded.add(modelId)
      return modelId
    },
    async unloadModel(modelId) {
      loaded.delete(modelId)
    },
    transcribe({ filePath, withTimestamps }) {
      const requestId = crypto.randomUUID()
      const work = (async (): Promise<QvacTranscribeResult> => {
        let contents: Buffer
        try {
          contents = await readFile(filePath)
        } catch {
          throw createAppError(
            "TRANSCRIPTION_FAILED",
            "There is no audio file to transcribe.",
            { retryable: false },
          )
        }
        assertWavFile(contents)
        const audioDurationMs = wavDataDurationMs(contents)
        const endMs = Math.max(audioDurationMs, 1)
        const segments = withTimestamps
          ? [
              {
                id: crypto.randomUUID(),
                text: "[mock transcript]",
                startMs: 0,
                endMs,
              },
            ]
          : []
        return {
          requestId,
          text: "[mock transcript]",
          segments,
        }
      })()
      return Object.assign(work, { requestId })
    },
    async completion() {
      return "{}"
    },
    async cancel() {},
    async close() {
      loaded.clear()
    },
  }
}
