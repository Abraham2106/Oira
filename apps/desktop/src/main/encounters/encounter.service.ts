import { createAppError, isAppError } from "../utils/app-error"
import type { AudioPort } from "../audio"
import type { TranscriptionPort } from "../transcription"
import { createMemoryEncounterRepository, type EncounterRepository } from "./encounter.repository"
import { assertTransition } from "./encounter.state"
import type { EncounterPort, EncounterRecord } from "./encounter.types"

export type Clock = {
  nowIso: () => string
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

export type EncounterServiceDeps = {
  repository?: EncounterRepository
  clock?: Clock
  createId?: () => string
  audio?: AudioPort
  transcription?: TranscriptionPort
}

function notFound(): never {
  throw createAppError(
    "INVALID_STATE_TRANSITION",
    "That encounter does not exist.",
    { retryable: false },
  )
}

export function createEncounterService(
  deps: EncounterServiceDeps = {},
): EncounterPort {
  const repository = deps.repository ?? createMemoryEncounterRepository()
  const clock = deps.clock ?? systemClock
  const createId = deps.createId ?? (() => crypto.randomUUID())
  const audio = deps.audio
  const transcription = deps.transcription

  const persist = async (record: EncounterRecord) => {
    await repository.update(record)
    return record
  }

  return {
    async start() {
      const active = await repository.findActive()
      if (active) {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "Only one encounter can be recording or transcribing at a time.",
          { retryable: false },
        )
      }

      const now = clock.nowIso()
      const created: EncounterRecord = {
        id: createId(),
        status: "created",
        createdAt: now,
        startedAt: null,
        endedAt: null,
        updatedAt: now,
        completedAt: null,
        transcriptId: null,
      }
      await repository.insert(created)

      assertTransition(created.status, "recording")
      const recording: EncounterRecord = {
        ...created,
        status: "recording",
        startedAt: now,
        updatedAt: now,
      }
      await persist(recording)
      if (audio) await audio.prepare(recording.id)
      return { encounterId: recording.id }
    },

    async appendChunk(encounterId, chunk) {
      const current = await repository.getById(encounterId)
      if (!current) notFound()
      if (current.status !== "recording") {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "Audio can only be appended while recording.",
          { retryable: false },
        )
      }
      if (!audio) {
        throw createAppError(
          "AUDIO_CAPTURE_FAILED",
          "Audio capture is not configured.",
          { retryable: false },
        )
      }
      await audio.appendChunk(encounterId, chunk)
    },

    async stop(encounterId) {
      const current = await repository.getById(encounterId)
      if (!current) notFound()

      let wavPath: string | undefined
      if (audio) {
        try {
          const finalized = await audio.finalize(encounterId)
          wavPath = finalized.wavPath
        } catch (error) {
          assertTransition(current.status, "failed")
          const now = clock.nowIso()
          await persist({
            ...current,
            status: "failed",
            endedAt: now,
            updatedAt: now,
          })
          throw isAppError(error)
            ? error
            : createAppError("AUDIO_CAPTURE_FAILED", "The recording could not be saved.", {
                retryable: true,
                cause: error,
              })
        }
      }

      assertTransition(current.status, "transcribing")
      const now = clock.nowIso()
      const next: EncounterRecord = {
        ...current,
        status: "transcribing",
        endedAt: now,
        updatedAt: now,
      }
      await persist(next)

      if (transcription && wavPath) {
        void transcription
          .transcribe({ encounterId, wavPath })
          .then(async ({ transcriptId }) => {
            const latest = await repository.getById(encounterId)
            if (!latest || latest.status !== "transcribing") return
            assertTransition(latest.status, "transcribed")
            const doneAt = clock.nowIso()
            await persist({
              ...latest,
              status: "transcribed",
              transcriptId,
              updatedAt: doneAt,
            })
          })
          .catch(async () => {
            const latest = await repository.getById(encounterId)
            if (!latest || latest.status !== "transcribing") return
            assertTransition(latest.status, "failed")
            const failedAt = clock.nowIso()
            await persist({
              ...latest,
              status: "failed",
              updatedAt: failedAt,
            })
          })
      }

      return { status: next.status }
    },
  }
}
