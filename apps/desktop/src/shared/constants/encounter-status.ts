export const ENCOUNTER_STATUSES = [
  "created",
  "recording",
  "transcribing",
  "transcribed",
  "drafting",
  "drafted",
  "completed",
  "failed",
  "discarded",
] as const

export type EncounterStatus = (typeof ENCOUNTER_STATUSES)[number]

export const ACTIVE_ENCOUNTER_STATUSES = ["recording", "transcribing"] as const

export type ActiveEncounterStatus = (typeof ACTIVE_ENCOUNTER_STATUSES)[number]

export function isActiveEncounterStatus(
  status: EncounterStatus,
): status is ActiveEncounterStatus {
  return (ACTIVE_ENCOUNTER_STATUSES as readonly string[]).includes(status)
}
