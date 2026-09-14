export const PRODUCT_STATES = [
  "IDLE",
  "RECORDING",
  "TRANSCRIBING",
  "STRUCTURING",
  "READY_FOR_REVIEW",
  "EDITING",
  "ACCEPTED",
  "EXPORTED",
  "ERROR",
] as const

export type ProductState = (typeof PRODUCT_STATES)[number]

export const AI_ENGINE_STATES = [
  "MODEL_NOT_READY",
  "MODEL_LOADING",
  "LOCAL_INFERENCE_READY",
] as const

export type AiEngineState = (typeof AI_ENGINE_STATES)[number]

export const AI_PIPELINE_STATES = [
  "TRANSCRIPTION_FAILED",
  "STRUCTURED_OUTPUT_INVALID",
] as const

export type AiPipelineState = (typeof AI_PIPELINE_STATES)[number]

export type AiState = AiEngineState | AiPipelineState

export const SECTION_IDS = [
  "visit_context",
  "clinical_narrative",
  "relevant_history",
  "reported_findings",
  "clinician_documented_assessment",
  "clinician_documented_plan",
  "follow_up",
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export const SECTION_TITLES: Record<SectionId, string> = {
  visit_context: "Motivo y contexto de la consulta",
  clinical_narrative: "Relato clínico",
  relevant_history: "Antecedentes relevantes",
  reported_findings: "Hallazgos comunicados",
  clinician_documented_assessment: "Evaluación documentada por el médico",
  clinician_documented_plan: "Plan e indicaciones documentados por el médico",
  follow_up: "Seguimiento",
}

export type FieldPresence = "STATED" | "NOT_STATED" | "UNKNOWN"
/** `LEGACY_UNVERIFIED` preserves records written before provenance existed. */
export type FieldProvenance = "EXTRACTED" | "CLINICIAN_EDITED" | "LEGACY_UNVERIFIED"

export type FieldValue = {
  text: string
  presence: FieldPresence
  sourceSegmentIds: string[]
  provenance: FieldProvenance
  reviewed: boolean
}

export const SPEAKER_ROLES = ["Médico", "Paciente"] as const

export type SpeakerRole = (typeof SPEAKER_ROLES)[number]

export type TranscriptSegment = {
  id: string
  /** P0 Whisper has no diarization — absent/null until a human binds a role. */
  speaker?: SpeakerRole | null
  startMs: number
  text: string
}

export type ClinicalNote = {
  sections: Record<SectionId, FieldValue>
}

/** UI view-model. The IPC contract is `OiraApi` in `apps/desktop/src/shared/types/oira-api.ts`. */
export type Encounter = {
  id: string
  startedAt: string
  label: string
  visitType: string
  transcript: TranscriptSegment[]
  note: ClinicalNote | null
}
