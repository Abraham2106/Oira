import { readFile } from "node:fs/promises"
import { assertWavFile, wavDataDurationMs } from "../audio/audio.format"
import type { TranscriptRecord } from "../../shared/types/transcript"
import { createAppError, isAppError } from "../utils/app-error"
import { createMockSttPort, type SttPort } from "./stt.port"
import {
  createMemoryTranscriptRepository,
  type TranscriptRepository,
} from "./transcript.repository"
import {
  canMoveTranscription,
  type TranscriptionJobStatus,
} from "./transcription.state"
import {
  TRANSCRIPTION_MAX_RETRIES,
  transcriptionTimeoutMs,
} from "./transcription.timeout"

export type TranscriptionProgress = {
  encounterId: string
  status: TranscriptionJobStatus
}

export type TranscriptionPort = {
  transcribe: (input: {
    encounterId: string
    wavPath: string
  }) => Promise<{ transcriptId: string }>
}

export function createTranscriptionService(deps?: {
  stt?: SttPort
  transcripts?: TranscriptRepository
  onProgress?: (event: TranscriptionProgress) => void
  timeoutMs?: (audioDurationMs: number) => number
}): TranscriptionPort {
  const stt = deps?.stt ?? createMockSttPort()
  const transcripts = deps?.transcripts ?? createMemoryTranscriptRepository()
  const onProgress = deps?.onProgress
  const resolveTimeout = deps?.timeoutMs ?? transcriptionTimeoutMs

  const emit = (encounterId: string, status: TranscriptionJobStatus) => {
    onProgress?.({ encounterId, status })
  }

  return {
    async transcribe({ encounterId, wavPath }) {
      let status: TranscriptionJobStatus = "idle"
      const move = (to: TranscriptionJobStatus) => {
        if (!canMoveTranscription(status, to)) {
          throw createAppError(
            "INVALID_STATE_TRANSITION",
            "That transcription action is not allowed in the current state.",
            { retryable: false },
          )
        }
        status = to
        emit(encounterId, status)
      }

      const wav = await readFile(wavPath).catch(() => {
        throw createAppError(
          "TRANSCRIPTION_FAILED",
          "There is no audio file to transcribe.",
          { retryable: false },
        )
      })
      assertWavFile(wav)
      const timeoutMs = resolveTimeout(wavDataDurationMs(wav))

      move("loading-model")
      move("transcribing")

      let lastError: unknown
      for (let attempt = 0; attempt <= TRANSCRIPTION_MAX_RETRIES; attempt += 1) {
        if (attempt > 0) {
          move("retrying")
          move("transcribing")
        }
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        const job = stt.transcribeFile(wavPath)
        try {
          const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              void stt.cancel(job.requestId)
              reject(
                createAppError("TRANSCRIPTION_FAILED", "Transcription timed out.", {
                  retryable: true,
                }),
              )
            }, timeoutMs)
          })
          const result = await Promise.race([job, timeout])
          const text = result.segments.map((segment) => segment.text).join(" ").trim()
          const record: TranscriptRecord = {
            id: crypto.randomUUID(),
            encounterId,
            text,
            segments: result.segments,
          }
          await transcripts.insert(record)
          move("done")
          return { transcriptId: record.id }
        } catch (error) {
          lastError = error
          const retryable =
            isAppError(error) &&
            error.retryable &&
            attempt < TRANSCRIPTION_MAX_RETRIES
          if (!retryable) break
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId)
        }
      }

      move("failed")
      if (isAppError(lastError)) throw lastError
      throw createAppError("TRANSCRIPTION_FAILED", "Transcription failed.", {
        retryable: false,
        cause: lastError,
      })
    },
  }
}
