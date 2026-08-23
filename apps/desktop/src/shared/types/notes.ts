import type { StructuredClinicalFacts } from "../schemas/clinical.schema"

export type DraftNote = {
  kind: "draft"
  id: string
  encounterId: string
  facts: StructuredClinicalFacts
  body: string
  model: { name: string; promptVersion: string }
  generatedAt: string
}

export type ApprovedNote = {
  kind: "approved"
  id: string
  encounterId: string
  body: string
  approvedBy: "local-user"
  approvedAt: string
  derivedFromDraftId: string
}

export type ExportableNote = {
  note: ApprovedNote
  facts: StructuredClinicalFacts | null
  model: { name: string | null; promptVersion: string | null }
}

export type ClinicalNoteDto = DraftNote | ApprovedNote

export function isApprovedNote(note: ClinicalNoteDto): note is ApprovedNote {
  return note.kind === "approved"
}

export function isDraftNote(note: ClinicalNoteDto): note is DraftNote {
  return note.kind === "draft"
}
