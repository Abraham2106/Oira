import type { SectionId } from "@oira/types"

/**
 * Códigos estables del contrato estricto de generación (Nivel 2 de
 * NOTE_VERIFIER_P3). Estabilidad: los códigos no deben renombrarse; son
 * consumidos por el retry loop (feedback al modelo), por las métricas del
 * runner y por el renderer. Cada código tiene un mensaje en español listo
 * para presentarse.
 */
export type GenerationIssueCode =
  | "EMPTY_OUTPUT"
  | "MISSING_SECTION"
  | "INVALID_PRESENCE"
  | "STATED_WITHOUT_TEXT"
  | "NOT_STATED_WITH_TEXT"
  | "INVALID_SOURCE_ID"

export type GenerationIssue = {
  code: GenerationIssueCode
  sectionId?: SectionId
  message: string
}

/** Feedback en una sola línea para el reintento del modelo. */
export function issueAsFeedback(issue: GenerationIssue): string {
  return `- ${issue.message}`
}