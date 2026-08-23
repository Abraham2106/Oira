import type { EncounterStatus } from "../constants/encounter-status"

export type EncounterRecord = {
  id: string
  status: EncounterStatus
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  updatedAt: string
  completedAt: string | null
  transcriptId: string | null
}
