import type { AppSettings } from "../config/settings.schema"
import type { EncounterRepository } from "../encounters/encounter.repository"
import { planRetention } from "./retention.policy"
import type { PurgePort } from "./purge.service"

export type RetentionJob = {
  run: () => Promise<{ actions: number }>
  start: () => void
  stop: () => void
}

export const RETENTION_INTERVAL_MS = 60 * 60 * 1000

export function createRetentionJob(deps: {
  settings: () => AppSettings
  encounters: EncounterRepository
  purge: PurgePort
  now?: () => Date
  intervalMs?: number
  setIntervalFn?: typeof setInterval
  clearIntervalFn?: typeof clearInterval
}): RetentionJob {
  const intervalMs = deps.intervalMs ?? RETENTION_INTERVAL_MS
  const setTimer = deps.setIntervalFn ?? setInterval
  const clearTimer = deps.clearIntervalFn ?? clearInterval
  let timer: ReturnType<typeof setInterval> | undefined

  const run = async () => {
    const orphans = await deps.purge.recoverOrphans()
    const records = await deps.encounters.list()
    const actions = planRetention(
      records.map((record) => ({
        encounterId: record.id,
        status: record.status,
        completedAt: record.completedAt,
        endedAt: record.endedAt,
        updatedAt: record.updatedAt,
        hasTranscript: Boolean(record.transcriptId),
      })),
      deps.settings(),
      deps.now?.() ?? new Date(),
    )

    for (const action of actions) {
      if (action.type === "purge-encounter") {
        await deps.purge.purgeEncounter(action.encounterId)
      } else if (action.type === "purge-audio") {
        await deps.purge.purgeAudio(action.encounterId)
      } else {
        await deps.purge.purgeTranscript(action.encounterId)
      }
    }

    return { actions: actions.length + orphans.orphanAudioDirs }
  }

  return {
    run,
    start() {
      if (timer !== undefined) return
      timer = setTimer(() => {
        void run()
      }, intervalMs)
    },
    stop() {
      if (timer === undefined) return
      clearTimer(timer)
      timer = undefined
    },
  }
}
