import type { ClinicalNote, FieldValue, TranscriptSegment } from "@oira/types"

/** Sentinel strings used to prove exporters do not rewrite clinical text. */
export const SENTINEL_TEMPERATURE = "36.8 °C"
export const SENTINEL_DOSE = "500 mg cada 8 horas"
export const SENTINEL_NEGATION = "niega fiebre"

function field(
  text: string,
  presence: FieldValue["presence"],
  sourceSegmentIds: string[] = [],
): FieldValue {
  return { text, presence, sourceSegmentIds, provenance: "EXTRACTED", reviewed: true }
}

export const SENTINEL_TRANSCRIPT: TranscriptSegment[] = [
  {
    id: "seg-temp",
    speaker: "Médico",
    startMs: 0,
    text: `Temperatura axilar ${SENTINEL_TEMPERATURE}. Ejemplo sintético.`,
  },
  {
    id: "seg-neg",
    speaker: "Paciente",
    startMs: 4_000,
    text: `El paciente ${SENTINEL_NEGATION}. Ejemplo sintético.`,
  },
  {
    id: "seg-dose",
    speaker: "Médico",
    startMs: 8_000,
    text: `Indica paracetamol ${SENTINEL_DOSE}. Ejemplo sintético.`,
  },
]

export function sentinelClinicalNote(): ClinicalNote {
  return {
    sections: {
      visit_context: field(
        `Consulta de control. Temperatura axilar ${SENTINEL_TEMPERATURE}.`,
        "STATED",
        ["seg-temp"],
      ),
      clinical_narrative: field(
        `El paciente ${SENTINEL_NEGATION} y acude por seguimiento sintético.`,
        "STATED",
        ["seg-neg"],
      ),
      relevant_history: field("", "NOT_STATED"),
      reported_findings: field(
        "No se dictó exploración en esta pista sintética.",
        "UNKNOWN",
        ["seg-dose"],
      ),
      clinician_documented_assessment: field(
        "Borrador sintético de demostración; no es una evaluación clínica.",
        "STATED",
        ["seg-temp"],
      ),
      clinician_documented_plan: field(
        `Paracetamol ${SENTINEL_DOSE}.`,
        "STATED",
        ["seg-dose"],
      ),
      follow_up: field("", "NOT_STATED"),
    },
  }
}
