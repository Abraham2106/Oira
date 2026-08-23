import {
  isActiveEncounterStatus,
  type EncounterStatus,
} from "../../shared/constants/encounter-status"
import type { EncounterRecord } from "../../shared/types/encounter"

export type { EncounterStatus }
export type { EncounterRecord }

export type EncounterPort = {
  create: () => Promise<EncounterRecord>
  start: (encounterId: string) => Promise<{ encounterId: string }>
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
