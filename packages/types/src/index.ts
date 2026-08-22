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

export type FieldValue = {
  text: string
  presence: FieldPresence
  sourceSegmentIds: string[]
  reviewed: boolean
}

export type TranscriptSegment = {
  id: string
  speaker: "Médico" | "Paciente"
  startMs: number
  text: string
}

export type ClinicalNote = {
  sections: Record<SectionId, FieldValue>
}

export type Encounter = {
  id: string
  startedAt: string
  label: string
  visitType: string
  transcript: TranscriptSegment[]
  note: ClinicalNote | null
}

/**
 * UI view-model only. The IPC API lives in
 * `apps/desktop/src/shared/types/notalocal-api.ts` (`NotaLocalAPI`).
 */
