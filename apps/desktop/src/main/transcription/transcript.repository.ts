import type { TranscriptRecord } from "../../shared/types/transcript"

export type TranscriptRepository = {
  insert: (record: TranscriptRecord) => Promise<void>
  getByEncounterId: (encounterId: string) => Promise<TranscriptRecord | undefined>
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
  }
}
