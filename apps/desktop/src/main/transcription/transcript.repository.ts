import type { TranscriptRecord } from "../../shared/types/transcript"

export type TranscriptRepository = {
  insert: (record: TranscriptRecord) => Promise<void>
  getByEncounterId: (encounterId: string) => Promise<TranscriptRecord | undefined>
  deleteByEncounterId: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
}

export function createMemoryTranscriptRepository(): TranscriptRepository {
  const byEncounter = new Map<string, TranscriptRecord>()
  return {
    async insert(record) {
      byEncounter.set(record.encounterId, { ...record, segments: [...record.segments] })
    },
    async getByEncounterId(encounterId) {
      const found = byEncounter.get(encounterId)
      return found
        ? { ...found, segments: [...found.segments] }
        : undefined
    },
    async deleteByEncounterId(encounterId) {
      byEncounter.delete(encounterId)
    },
    async listEncounterIds() {
      return [...byEncounter.keys()]
    },
  }
}
