import {
  SECTION_IDS,
  type ClinicalNote,
  type FieldValue,
  type SectionId,
  type TranscriptSegment,
} from "@oira/types"
import { GLOSSARY, retrieveTerms } from "./glossary"

type RouteRule = {
  section: SectionId
  pattern: RegExp
}

/**
 * Orden con significado: lo específico (motivo, seguimiento, plan) gana sobre
 * lo genérico. El relato clínico es el destino por defecto, nunca se inventa.
 */
const ROUTES: readonly RouteRule[] = [
  {
    section: "visit_context",
    pattern: /(motivo|acude|consulta por|trae hoy|primera vez)/,
  },
  {
    section: "follow_up",
    pattern: /(seguimiento|control en|retorno|pr[óo]xima cita|revisamos en|vuelva)/,
  },
  {
    section: "clinician_documented_plan",
    pattern: /(plan|receta|indicaci[óo]|prescri|orden[ée]|reposo)/,
  },
  {
    section: "clinician_documented_assessment",
    pattern: /(evaluaci[óo]n|diagn[óo]stico|impresi[óo]n cl[íi]nica|sugiere|probable)/,
  },
  {
    section: "reported_findings",
    pattern: /(exploraci[óo]n|examen f[íi]sico|presenta|signos?|tensión arterial|auscult)/,
  },
  {
    section: "relevant_history",
    pattern:
      /(antecedente|padece|diagnosticad[oa] de|operad[oa]|cirug[íi]a previa|medicaci[óo]n cr[óo]nica|historia familiar)/,
  },
]

/** Negación simple para no convertir «no hay diagnóstico» en evaluación. */
const NEGATION =
  /(no hay|sin|descart\w*|niega)\s+(?:un\s+|una\s+)?(diagn[óo]stico|hallazgo|evaluaci[óo]n)/

function routeSegment(segment: TranscriptSegment): SectionId {
  const text = segment.text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  for (const rule of ROUTES) {
    if (rule.section === "reported_findings" || rule.section === "clinician_documented_assessment") {
      if (NEGATION.test(text)) continue
    }
    if (rule.pattern.test(text)) {
      return rule.section
    }
  }
  return "clinical_narrative"
}

function emptyField(): FieldValue {
  return { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false }
}

export function assembleNote(transcript: readonly TranscriptSegment[]): ClinicalNote {
  const buckets = new Map<SectionId, TranscriptSegment[]>(
    SECTION_IDS.map((id) => [id, []]),
  )

  for (const segment of transcript) {
    buckets.get(routeSegment(segment))?.push(segment)
  }

  const sections = Object.fromEntries(
    SECTION_IDS.map((id) => {
      const segments = buckets.get(id) ?? []
      if (segments.length === 0) {
        return [id, emptyField()]
      }
      const field: FieldValue = {
        text: segments.map((segment) => segment.text.trim()).join(" "),
        presence: "STATED",
        sourceSegmentIds: segments.map((segment) => segment.id),
        reviewed: false,
      }
      return [id, field]
    }),
  ) as ClinicalNote["sections"]

  return { sections }
}

function replaceMatches(text: string): string {
  let output = text
  for (const hit of retrieveTerms(text)) {
    if (hit.matched === hit.canonical) continue
    const escaped = hit.matched.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    output = output.replace(
      new RegExp(`\\b${escaped}\\b`, "gi"),
      hit.canonical,
    )
  }
  return output
}

/** Normaliza terminología coloquial → clínica sin tocar presencia ni orígenes. */
export function applyGlossary(note: ClinicalNote): ClinicalNote {
  return {
    sections: Object.fromEntries(
      Object.entries(note.sections).map(([id, field]) => [
        id,
        { ...field, text: replaceMatches(field.text) },
      ]),
    ) as ClinicalNote["sections"],
  }
}

export { GLOSSARY, retrieveTerms }
