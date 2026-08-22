import { createAppError } from "../utils/app-error"
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
      await repository.update(recording)
      return { encounterId: recording.id }
    },

    async stop(encounterId) {
      const current = await repository.getById(encounterId)
      if (!current) notFound()

      assertTransition(current.status, "transcribing")
      const now = clock.nowIso()
      const next: EncounterRecord = {
        ...current,
        status: "transcribing",
        endedAt: now,
        updatedAt: now,
      }
      await repository.update(next)
      return { status: next.status }
    },
  }
}
