import type { ClinicalNote } from "@notalocal/types"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import type { GenerateNoteResult } from "../../shared/types/notalocal-api"
import { encounterNotFoundError } from "../errors/encounters"
import type { EncounterRepository } from "../encounters/encounter.repository"

export type NotesPort = {
  generate: (encounterId: string) => Promise<GenerateNoteResult>
  save: (input: {
    encounterId: string
    note: ClinicalNote
  }) => Promise<{ noteId: string }>
}

export type NotesServiceDeps = {
  encounters?: EncounterRepository
  createId?: () => string
}

export function createNotesStub(deps: NotesServiceDeps = {}): NotesPort {
  const saved = new Map<string, ClinicalNote>()
  const createId = deps.createId ?? (() => crypto.randomUUID())

  return {
    async generate(encounterId) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(encounterId)
        if (!record) throw encounterNotFoundError()
      }
      return {
        transcript: SYNTHETIC_TRANSCRIPT,
        note: syntheticClinicalNote(),
      }
    },
    async save(input) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(input.encounterId)
        if (!record) throw encounterNotFoundError()
      }
      saved.set(input.encounterId, input.note)
      return { noteId: createId() }
    },
  }
}
