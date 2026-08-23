import type { ClinicalNote, FieldValue, TranscriptSegment } from "@oira/types"

function field(
  text: string,
  presence: FieldValue["presence"],
  sourceSegmentIds: string[] = [],
): FieldValue {
  return { text, presence, sourceSegmentIds, reviewed: false }
}

export const SYNTHETIC_TRANSCRIPT: TranscriptSegment[] = [
  {
    id: "seg-1",
    speaker: "Médico",
    startMs: 0,
    text: "Esta es una consulta de demostración con datos sintéticos. ¿Qué le trae hoy?",
  },
  {
    id: "seg-2",
    speaker: "Paciente",
    startMs: 4000,
    text: "Dolor de rodilla izquierda desde hace tres días, sin golpe. Ejemplo ficticio.",
  },
  {
    id: "seg-3",
    speaker: "Médico",
    startMs: 12000,
    text: "Queda como borrador para revisión. No hay diagnóstico de este prototipo.",
  },
]

export function syntheticClinicalNote(): ClinicalNote {
  return {
    sections: {
      visit_context: field(
        "Consulta ambulatoria de demostración por dolor de rodilla izquierda.",
        "STATED",
        ["seg-1", "seg-2"],
      ),
      clinical_narrative: field(
        "El paciente de ejemplo refiere dolor de tres días, sin trauma mencionado.",
        "STATED",
        ["seg-2"],
      ),
      relevant_history: field("", "NOT_STATED"),
      reported_findings: field(
        "No se dictó exploración en esta pista sintética.",
        "UNKNOWN",
        ["seg-3"],
      ),
      clinician_documented_assessment: field(
        "El médico indicó que esto es un borrador de demostración, no una evaluación clínica.",
        "STATED",
        ["seg-3"],
      ),
      clinician_documented_plan: field("", "NOT_STATED"),
      follow_up: field("", "NOT_STATED"),
    },
  }
}
