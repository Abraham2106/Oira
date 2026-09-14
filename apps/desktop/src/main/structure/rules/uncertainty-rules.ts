import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import { tokens } from "./text-utils"

const UNCERTAINTY_SOURCE = [
  "posible", "probable", "sospecha", "sospechoso", "sugiere",
  "compatibles con", "compatible con", "orienta a", "no se descarta",
  "podría ser", "podria ser", "quizás", "quizas", "tal vez",
  "presuntamente", "presunto", "presunta", "hipótesis", "hipotesis",
  "dudoso", "incierto", "indeterminado",
]
const CERTAINTY_DRAFT = [
  "confirmado", "confirmada", "diagnóstico", "diagnostico", "diagnostica",
  "es", "tiene", "padece", "sufre", "presenta", "afirmo", "afirma",
  "evidencia", "evidencia de", "demuestra", "prueba",
]

/** EV-UNC-* — preservación de incertidumbre y no elevar hipótesis. */

function hasUncertainty(text: string): boolean {
  const t = tokens(text)
  return t.some((w) => UNCERTAINTY_SOURCE.includes(w))
}

function hasCertainty(text: string): boolean {
  const t = tokens(text)
  return t.some((w) => CERTAINTY_DRAFT.includes(w))
}

export function detectCertaintyEscalation(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // La fuente expresa incertidumbre pero el borrador afirma certeza
  if (!hasUncertainty(sourceText)) return undefined
  if (!hasCertainty(draftText)) return undefined
  // Si el borrador también expresa incertidumbre, no hay escalación
  if (hasUncertainty(draftText)) return undefined

  return {
    code: "UNCERTAINTY_LOST",
    sectionId,
    message: "El borrador eleva a certeza una hipótesis que la fuente deja en duda.",
  }
}

export function detectInventedCertainty(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // El borrador usa términos de certeza pero la fuente no tiene base para ello
  if (!hasCertainty(draftText)) return undefined
  // Si la fuente ya tiene certeza o incertidumbre explícita, no hay invención
  if (hasCertainty(sourceText) || hasUncertainty(sourceText)) return undefined

  return {
    code: "INVENTED_CERTAINTY",
    sectionId,
    message: "El borrador afirma certeza sin que la fuente la sustente.",
  }
}