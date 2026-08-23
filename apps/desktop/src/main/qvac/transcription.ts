import os from "node:os"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import { mapSttSegments } from "../inference/map-transcript"
import type { TranscriptionPort } from "../inference/port"
import { P0_STT_MODEL_ID } from "./model-ids"

const DEFAULT_LOAD_IDLE_MS = 120_000
const MIN_LOAD_IDLE_MS = 10_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

const STT_CONFIG = {
  language: "es",
  translate: false,
  temperature: 0,
  suppress_blank: true,
  suppress_nst: true,
  no_context: true,
  no_timestamps: false,
  strategy: "beam_search" as const,
  beam_search_beam_size: 5,
}

function assertMemory(): void {
  if (os.freemem() < MIN_FREE_BYTES) {
    throw transcriptionFailedError("LOW_MEMORY")
  }
}

function loadIdleTimeoutMs(): number {
  const parsed = Number.parseInt(
    process.env.OIRA_STT_LOAD_TIMEOUT_MS ?? "",
    10,
  )
  if (!Number.isFinite(parsed)) return DEFAULT_LOAD_IDLE_MS
  return Math.max(parsed, MIN_LOAD_IDLE_MS)
}

/** On-device Whisper: load → transcribe → unload → close. Never stays resident. */
export function createQvacTranscription(): TranscriptionPort {
  return {
    async transcribe(input) {
      if (!input.filePath) throw transcriptionFailedError()
      const {
        close,
        loadModel,
        transcribe,
        unloadModel,
        WHISPER_SMALL_Q8_0,
      } = await import("./sdk")
      if (WHISPER_SMALL_Q8_0.name !== P0_STT_MODEL_ID) {
        throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
      }
      assertMemory()
      let modelId: string | undefined
      try {
        const idleMs = loadIdleTimeoutMs()
        // First run downloads the model (~264 MB), so a wall-clock cap would
        // kill healthy slow downloads. Fail only when progress goes silent.
        modelId = await new Promise<string>((resolve, reject) => {
          let settled = false
          let idleTimer: ReturnType<typeof setTimeout> | undefined
          const settle = (finish: () => void): void => {
            if (settled) return
            settled = true
            clearTimeout(idleTimer)
            finish()
          }
          const bumpIdle = (): void => {
            clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
              settle(() => reject(transcriptionFailedError("LOAD_WATCHDOG")))
            }, idleMs)
          }
          bumpIdle()
          loadModel({
            modelSrc: WHISPER_SMALL_Q8_0,
            modelConfig: STT_CONFIG,
            onProgress: () => bumpIdle(),
          }).then(
            (id) => settle(() => resolve(id)),
            (error) => settle(() => reject(error)),
          )
        })
        const raw = await transcribe({
          modelId,
          audioChunk: input.filePath,
          metadata: true,
        })
        return { segments: mapSttSegments(raw) }
      } catch (error) {
        if (isAppError(error)) throw error
        throw transcriptionFailedError(
          error instanceof Error ? error.message : "TRANSCRIPTION_FAILED",
        )
      } finally {
        if (modelId) await unloadModel({ modelId }).catch(() => undefined)
        await close().catch(() => undefined)
      }
    },
  }
}
