import os from "node:os"
import { isAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import { mapSttSegments } from "../inference/map-transcript"
import type { TranscriptionPort } from "../inference/port"
import { P0_STT_MODEL_ID } from "./model-ids"

const LOAD_WATCHDOG_MS = 120_000
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
            modelConfig: STT_CONFIG,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(transcriptionFailedError("LOAD_WATCHDOG")), LOAD_WATCHDOG_MS)
          }),
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
