import { encounterNotFoundError } from "../errors/encounters"
import type { AudioCapturePort, Clock } from "../ports/outbound"
import { createMemoryEncounterRepository, type EncounterRepository } from "./encounter.repository"
import { assertTransition } from "./encounter.state"
import type { EncounterPort, EncounterRecord } from "./encounter.types"

export type { Clock }

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

export type EncounterServiceDeps = {
  repository?: EncounterRepository
  clock?: Clock
  createId?: () => string
  audio?: AudioCapturePort
}

function notFound(): never {
  throw encounterNotFoundError()
}

export function createEncounterService(
  deps: EncounterServiceDeps = {},
): EncounterPort {
  const repository = deps.repository ?? createMemoryEncounterRepository()
  const clock = deps.clock ?? systemClock
  const createId = deps.createId ?? (() => crypto.randomUUID())
  const audio = deps.audio

  async function discard(encounterId: string) {
    const current = await repository.getById(encounterId)
    if (!current) notFound()
    if (current.status === "discarded" || current.status === "completed") {
      return { status: current.status }
    }

    assertTransition(current.status, "discarded")
    const now = clock.nowIso()
    const next: EncounterRecord = {
      ...current,
      status: "discarded",
      endedAt: current.endedAt ?? now,
      updatedAt: now,
    }
    await repository.update(next)
    audio?.purge(encounterId)
    return { status: next.status }
  }

  return {
    async start(input = {}) {
      const active = await repository.findActive()
      if (active) {
        await discard(active.id)
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
        label: input.label ?? "",
        visitType: input.visitType ?? "",
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
      audio?.prepare(recording.id)
      return { encounterId: recording.id, startedAt: now }
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
      audio?.finalize(encounterId)
      return { status: next.status }
    },

    discard,

    async getById(id) {
      return repository.getById(id)
    },

    async advance(id, to) {
      const current = await repository.getById(id)
      if (!current) notFound()
      if (current.status === "discarded") return
      assertTransition(current.status, to)
      await repository.update({
        ...current,
        status: to,
        updatedAt: clock.nowIso(),
        ...(to === "completed" ? { completedAt: clock.nowIso() } : {}),
      })
    },
  }
}
