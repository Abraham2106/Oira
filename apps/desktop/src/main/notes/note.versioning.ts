import type { StructuredClinicalFacts } from "../../shared/schemas/clinical.schema"

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
