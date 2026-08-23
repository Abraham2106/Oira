import type { AppSettings } from "../config/settings.schema"
import type { EncounterStatus } from "../../shared/constants/encounter-status"

export const FAILED_AUDIO_RETENTION_MS = 24 * 60 * 60 * 1000

export type RetentionTarget = {
  encounterId: string
  status: EncounterStatus
  completedAt: string | null
  endedAt: string | null
  updatedAt: string
  hasTranscript: boolean
}

export type RetentionAction =
  | { type: "purge-audio"; encounterId: string }
  | { type: "purge-transcript"; encounterId: string }
  | { type: "purge-encounter"; encounterId: string }

function ageMs(iso: string, now: Date): number {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 0
  return now.getTime() - then
}

export function planRetention(
  targets: RetentionTarget[],
  settings: AppSettings,
  now: Date = new Date(),
): RetentionAction[] {
  const actions: RetentionAction[] = []

  for (const target of targets) {
    if (target.status === "discarded") {
      actions.push({ type: "purge-encounter", encounterId: target.encounterId })
      continue
    }

    if (
      settings.audioRetention === "until-note-approved" &&
      target.status === "completed"
    ) {
      actions.push({ type: "purge-audio", encounterId: target.encounterId })
    }

    if (target.status === "failed") {
      const stamp = target.endedAt ?? target.updatedAt
      if (ageMs(stamp, now) >= FAILED_AUDIO_RETENTION_MS) {
        actions.push({ type: "purge-audio", encounterId: target.encounterId })
      }
    }

    if (
      target.hasTranscript &&
      settings.transcriptRetention !== "forever" &&
      settings.transcriptRetention.unit === "days"
    ) {
      const stamp = target.endedAt ?? target.updatedAt
      const limitMs = settings.transcriptRetention.value * 24 * 60 * 60 * 1000
      if (ageMs(stamp, now) >= limitMs) {
        actions.push({
          type: "purge-transcript",
          encounterId: target.encounterId,
        })
      }
    }
  }

  return actions
}
