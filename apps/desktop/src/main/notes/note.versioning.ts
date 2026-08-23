import type { StructuredClinicalFacts } from "../../shared/schemas/clinical.schema"
import type { NoteVersionRecord } from "../../shared/types/repositories"

export type { NoteRecord, NoteVersionKind, NoteVersionRecord } from "../../shared/types/repositories"

export function createDraftVersion(input: {
  id: string
  noteId: string
  encounterId: string
  facts: StructuredClinicalFacts
  body: string
  modelName: string
  promptVersion: string
  createdAt: string
}): NoteVersionRecord {
  return {
    ...input,
    kind: "draft",
  }
}

export function createApprovedVersion(input: {
  id: string
  noteId: string
  encounterId: string
  body: string
  createdAt: string
}): NoteVersionRecord {
  return {
    ...input,
    kind: "approved",
    facts: null,
    modelName: null,
    promptVersion: null,
  }
}
