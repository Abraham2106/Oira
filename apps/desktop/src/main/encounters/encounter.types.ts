import {
  isActiveEncounterStatus,
  type EncounterStatus,
} from "../../shared/constants/encounter-status"

export type { EncounterStatus }

export type EncounterRecord = {
  id: string
  status: EncounterStatus
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  updatedAt: string
  completedAt: string | null
  transcriptId: string | null
  label: string
  visitType: string
}

export type EncounterPort = {
  start: (input?: {
    label?: string
    visitType?: string
  }) => Promise<{ encounterId: string; startedAt: string }>
  stop: (encounterId: string) => Promise<{ status: EncounterStatus }>
}

export { isActiveEncounterStatus }
