import type { TranscriptRecord } from "../../shared/types/transcript"
import type { TranscriptRepository } from "../../shared/types/repositories"

export type { TranscriptRepository }

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
