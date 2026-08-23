import { readFile } from "node:fs/promises"
import { assertWavFile, wavDataDurationMs } from "../audio/audio.format"
import type { TranscriptionJobStatus } from "../../shared/constants/transcription-status"
import type { TranscriptRecord } from "../../shared/types/transcript"
import { createAppError, isAppError } from "../utils/app-error"
import { DEFAULT_MODEL_CONFIG } from "../qvac/model.config"
import { createMockSttPort, type SttJob, type SttPort } from "./stt.port"
import {
  createMemoryTranscriptRepository,
  type TranscriptRepository,
} from "./transcript.repository"
import { canMoveTranscription } from "./transcription.state"
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
  cancel: (encounterId: string) => Promise<void>
}

const NON_RETRYABLE_CODES = new Set([
  "AUDIO_FORMAT_UNSUPPORTED",
  "MODEL_NOT_READY",
  "OPERATION_CANCELLED",
  "INVALID_INPUT",
])

function shouldRetry(error: unknown, attempt: number): boolean {
  if (attempt >= TRANSCRIPTION_MAX_RETRIES) return false
  if (!isAppError(error) || !error.retryable) return false
  return !NON_RETRYABLE_CODES.has(error.code)
}

export function createTranscriptionService(deps?: {
  stt?: SttPort
  transcripts?: TranscriptRepository
  onProgress?: (event: TranscriptionProgress) => void
  timeoutMs?: (audioDurationMs: number) => number
  sttModelName?: string
}): TranscriptionPort {
  const stt = deps?.stt ?? createMockSttPort()
  const transcripts = deps?.transcripts ?? createMemoryTranscriptRepository()
  const sttModelName = deps?.sttModelName ?? DEFAULT_MODEL_CONFIG.stt.modelType
  const onProgress = deps?.onProgress
  const resolveTimeout = deps?.timeoutMs ?? transcriptionTimeoutMs
  type Inflight = {
    job: SttJob | null
    cancelled: boolean
    aborted: Promise<never>
    abort: (error: unknown) => void
  }

  const inflight = new Map<string, Inflight>()

  const createInflight = (): Inflight => {
    let abort: (error: unknown) => void = () => undefined
    const aborted = new Promise<never>((_, reject) => {
      abort = reject
    })
    void aborted.catch(() => undefined)
    return { job: null, cancelled: false, aborted, abort }
  }

  const emit = (encounterId: string, status: TranscriptionJobStatus) => {
    onProgress?.({ encounterId, status })
  }

  return {
    async cancel(encounterId) {
      const slot = inflight.get(encounterId)
      if (!slot) return
      slot.cancelled = true
      slot.abort(
        createAppError("OPERATION_CANCELLED", "Transcription was cancelled.", {
          retryable: false,
        }),
      )
      if (slot.job) await stt.cancel(slot.job.requestId)
    },

    async transcribe({ encounterId, wavPath }) {
      const slot = createInflight()
      inflight.set(encounterId, slot)
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

      const finishCancelled = (): never => {
        if (status !== "cancelled") move("cancelled")
        throw createAppError(
          "OPERATION_CANCELLED",
          "Transcription was cancelled.",
          { retryable: false },
        )
      }

      try {
        const wav = await readFile(wavPath).catch(() => {
          throw createAppError(
            "TRANSCRIPTION_FAILED",
            "There is no audio file to transcribe.",
            { retryable: false },
          )
        })
        assertWavFile(wav)
        if (slot.cancelled) finishCancelled()
        const timeoutMs = resolveTimeout(wavDataDurationMs(wav))

        move("loading-model")
        if (slot.cancelled) finishCancelled()
        move("transcribing")

        let lastError: unknown
        for (let attempt = 0; attempt <= TRANSCRIPTION_MAX_RETRIES; attempt += 1) {
          if (slot.cancelled) finishCancelled()
          if (attempt > 0) {
            move("retrying")
            move("transcribing")
          }
          let timeoutId: ReturnType<typeof setTimeout> | undefined
          const job = stt.transcribeFile(wavPath)
          slot.job = job
          if (slot.cancelled) {
            await stt.cancel(job.requestId)
            finishCancelled()
          }
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
            const result = await Promise.race([job, timeout, slot.aborted])
            if (slot.cancelled) finishCancelled()
            const text = result.segments.map((segment) => segment.text).join(" ").trim()
            const record: TranscriptRecord = {
              id: crypto.randomUUID(),
              encounterId,
              text,
              segments: result.segments,
              sttModel: sttModelName,
            }
            await transcripts.insert(record)
            move("done")
            return { transcriptId: record.id }
          } catch (error) {
            lastError = error
            if (slot.cancelled || (isAppError(error) && error.code === "OPERATION_CANCELLED")) {
              finishCancelled()
            }
            if (!shouldRetry(error, attempt)) break
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
      } finally {
        inflight.delete(encounterId)
      }
    },
  }
}
