import type { SectionId, TranscriptSegment } from "@oira/types"
import type { ClinicalNote } from "@oira/types"

/**
 * Tipos compartidos del verificador de notas (F3 de NOTE_VERIFIER_P3).
 * El renderer consume estos tipos para mostrar la revisión; el backend los
 * produce. Viven aquí para que el contrato IPC no dependa del main process.
 */

export type NoteClaimStatus =
  | "SUPPORTED"
  | "CONTRADICTED"
  | "INSUFFICIENT_EVIDENCE"
  | "AMBIGUOUS"

export type NoteClaimSeverity = "blocking" | "warning"

export type NoteProblemType =
  | "invention"
  | "contradiction"
  | "negation"
  | "dose"
  | "unit"
  | "subject"
  | "temporal"
  | "uncertainty"
  | "omission"
  | "other"

export type NoteClaimEvidence = {
  segmentIds: string[]
  quotes: string[]
}

export type NoteClaimObservation = {
  sectionId: SectionId
  claim: string
  status: NoteClaimStatus
  severity: NoteClaimSeverity
  problemType: NoteProblemType
  evidence: NoteClaimEvidence
  explanation: string
}

export type NoteOmission = {
  sectionId: SectionId
  missingClaim: string
  expectedFromSource: string
}

export type NoteVerificationInput = {
  transcript: TranscriptSegment[]
  note: ClinicalNote
}

export type NoteVerifierPort = {
  verify: (input: NoteVerificationInput) => Promise<NoteVerificationResult>
}

export type NoteVerificationResult =
  | { status: "completed"; observations: NoteClaimObservation[]; omissions: NoteOmission[] }
  | { status: "not_completed"; error: string }