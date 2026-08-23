import os from "node:os"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import { mapSttSegments } from "../inference/map-transcript"
import type { TranscriptionPort } from "../inference/port"
import { WHISPER_INITIAL_PROMPT } from "./clinical-vocab"
import { P0_STT_MODEL_ID } from "./model-ids"
import { rejectOnTimeout } from "./watchdog"

const LOAD_WATCHDOG_MS = 120_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

/** Q7: initial_prompt stays off unless NOTALOCAL_STT_PROMPT=1 (insertions must be 0). */
export function whisperSttConfig(): {
  language: string
  translate: boolean
  temperature: number
  suppress_blank: boolean
  suppress_nst: boolean
  no_context: boolean
  no_timestamps: boolean
  strategy: "beam_search"
  beam_search_beam_size: number
  initial_prompt?: string
} {
  const config = {
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
  if (process.env.NOTALOCAL_STT_PROMPT === "1") {
    return { ...config, initial_prompt: WHISPER_INITIAL_PROMPT }
  }
  return config
}

function assertMemory(): void {
  if (process.env.NODE_ENV === "test") return
  if (os.freemem() < MIN_FREE_BYTES) {
    throw transcriptionFailedError("LOW_MEMORY")
  }
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
        modelId = await Promise.race([
          loadModel({
            modelSrc: WHISPER_SMALL_Q8_0,
            modelConfig: whisperSttConfig(),
          }),
          rejectOnTimeout(LOAD_WATCHDOG_MS, () => transcriptionFailedError("LOAD_WATCHDOG")),
        ])
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
