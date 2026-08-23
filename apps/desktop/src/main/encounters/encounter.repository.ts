import { isActiveEncounterStatus } from "../../shared/constants/encounter-status"
import type { EncounterRecord } from "./encounter.types"

export type EncounterRepository = {
  insert: (record: EncounterRecord) => Promise<void>
  getById: (id: string) => Promise<EncounterRecord | undefined>
  update: (record: EncounterRecord) => Promise<void>
  findActive: () => Promise<EncounterRecord | undefined>
  list: () => Promise<EncounterRecord[]>
  delete: (id: string) => Promise<void>
}

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
  }
}
