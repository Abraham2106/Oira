import type { EncounterRecord } from "./encounter"
import type { TranscriptRecord } from "./transcript"
import type { StructuredClinicalFacts } from "../schemas/clinical.schema"

export type EncounterRepository = {
  insert: (record: EncounterRecord) => Promise<void>
  getById: (id: string) => Promise<EncounterRecord | undefined>
  update: (record: EncounterRecord) => Promise<void>
  findActive: () => Promise<EncounterRecord | undefined>
  list: () => Promise<EncounterRecord[]>
  delete: (id: string) => Promise<void>
}

export type TranscriptRepository = {
  insert: (record: TranscriptRecord) => Promise<void>
  getByEncounterId: (encounterId: string) => Promise<TranscriptRecord | undefined>
  deleteByEncounterId: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
}

export type NoteVersionKind = "draft" | "approved"

export type NoteRecord = {
  id: string
  encounterId: string
  currentVersionId: string | null
  approvedVersionId: string | null
  createdAt: string
  updatedAt: string
}

export type NoteVersionRecord = {
  id: string
  noteId: string
  encounterId: string
  kind: NoteVersionKind
  body: string
  facts: StructuredClinicalFacts | null
  modelName: string | null
  promptVersion: string | null
  createdAt: string
}

export type NotesRepository = {
  getByEncounterId: (
    encounterId: string,
  ) => Promise<{ note: NoteRecord; versions: NoteVersionRecord[] } | undefined>
  insertNote: (note: NoteRecord) => Promise<void>
  insertVersion: (version: NoteVersionRecord) => Promise<void>
  updateNote: (note: NoteRecord) => Promise<void>
  deleteByEncounterId: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
}
