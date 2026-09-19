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
  // Serialize start() so two concurrent START_ENCOUNTER calls cannot both
  // observe "no active encounter" and create two active recordings.
  let startChain: Promise<unknown> = Promise.resolve()

  function sanitizeLabel(value: string | undefined): string {
    if (typeof value !== "string") return ""
    return value.trim().slice(0, 200)
  }

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
    // Audio purge is best-effort: the encounter is already discarded, and
    // orphan sweeps handle leftovers. Never fail discard() on purge errors.
    try {
      audio?.purge(encounterId)
    } catch {
      /* orphan audio is swept on startup */
    }
    return { status: next.status }
  }

  return {
    async start(input = {}) {
      const run = startChain
        .catch(() => undefined)
        .then(async () => {
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
            label: sanitizeLabel(input.label),
            visitType: sanitizeLabel(input.visitType),
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
          try {
            audio?.prepare(recording.id)
          } catch (prepareError) {
            // Compensate: DB already moved to recording, roll back to
            // discarded so no orphan active encounter remains.
            try {
              await discard(recording.id)
            } catch {
              /* discard is best-effort here */
            }
            throw prepareError
          }
          return { encounterId: recording.id, startedAt: now }
        })
      startChain = run
      return run
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
      if (current.status === to) return
      // The generate pipeline may still try to mark a discarded encounter as
      // failed; treat it as a terminal no-op instead of crashing the pipeline.
      if (current.status === "discarded") return
      assertTransition(current.status, to)
      const now = clock.nowIso()
      await repository.update({
        ...current,
        status: to,
        updatedAt: now,
        ...(to === "completed" ? { completedAt: now } : {}),
      })
    },
  }
}
