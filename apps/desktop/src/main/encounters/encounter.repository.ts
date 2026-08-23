import { isActiveEncounterStatus } from "../../shared/constants/encounter-status"
import type { EncounterRecord } from "../../shared/types/encounter"
import type { EncounterRepository } from "../../shared/types/repositories"

export type { EncounterRepository }

export function createMemoryEncounterRepository(): EncounterRepository {
  const byId = new Map<string, EncounterRecord>()

  return {
    async insert(record) {
      byId.set(record.id, { ...record })
    },
    async getById(id) {
      const found = byId.get(id)
      return found ? { ...found } : undefined
    },
    async update(record) {
      byId.set(record.id, { ...record })
    },
    async findActive() {
      for (const record of byId.values()) {
        if (isActiveEncounterStatus(record.status)) return { ...record }
      }
      return undefined
    },
    async list() {
      return [...byId.values()].map((record) => ({ ...record }))
    },
    async delete(id) {
      byId.delete(id)
    },
    async setAudioMeta() {},
  }
}
