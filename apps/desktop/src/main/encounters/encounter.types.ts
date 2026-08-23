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
}

export type EncounterPort = {
  start: () => Promise<{ encounterId: string }>
  appendChunk: (encounterId: string, chunk: Uint8Array) => Promise<void>
  stop: (encounterId: string) => Promise<{ status: EncounterStatus }>
  get: (encounterId: string) => Promise<EncounterRecord>
  discard: (encounterId: string) => Promise<{ status: EncounterStatus }>
  beginDrafting: (encounterId: string) => Promise<EncounterRecord>
  markDrafted: (encounterId: string) => Promise<EncounterRecord>
  markCompleted: (encounterId: string) => Promise<EncounterRecord>
  markFailed: (encounterId: string) => Promise<EncounterRecord>
}

export { isActiveEncounterStatus }
