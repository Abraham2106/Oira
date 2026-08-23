import { describe, expect, it } from "vitest"
import type { TranscriptSegment } from "@oira/types"
import { SYNTHETIC_TRANSCRIPT } from "../../shared/fixtures/synthetic-consult"
import { applyGlossary, assembleNote } from "./heuristic-assembler"

describe("main/structure/heuristic-assembler", () => {
  it("ensambla la transcripción sintética de forma determinista", () => {
    const note = assembleNote(SYNTHETIC_TRANSCRIPT)
    const expected: typeof note = {
      sections: {
        visit_context: {
          text: "Esta es una consulta de demostración con datos sintéticos. ¿Qué le trae hoy?",
          presence: "STATED",
          sourceSegmentIds: ["seg-1"],
          reviewed: false,
        },
        clinical_narrative: {
          text:
            "Dolor de rodilla izquierda desde hace tres días, sin golpe. Ejemplo ficticio. " +
            "Queda como borrador para revisión. No hay diagnóstico de este prototipo.",
          presence: "STATED",
          sourceSegmentIds: ["seg-2", "seg-3"],
          reviewed: false,
        },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: {
          text: "",
          presence: "NOT_STATED",
          sourceSegmentIds: [],
          reviewed: false,
        },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }

    expect(note).toEqual(expected)
    expect(assembleNote(SYNTHETIC_TRANSCRIPT)).toEqual(note)
  })

  it("no convierte una negación en evaluación documentada", () => {
    const transcript: TranscriptSegment[] = [
      { id: "a1", speaker: "Médico", startMs: 0, text: "No hay diagnóstico claro hoy." },
    ]
    const note = assembleNote(transcript)

    expect(note.sections.clinician_documented_assessment.presence).toBe("NOT_STATED")
    expect(note.sections.clinical_narrative.sourceSegmentIds).toEqual(["a1"])
  })

  it("aplica el glosario sin tocar presencia ni orígenes", () => {
    const transcript: TranscriptSegment[] = [
      {
        id: "b1",
        speaker: "Paciente",
        startMs: 0,
        text: "El paciente refiere presión alta y azúcar alta.",
      },
    ]
    const note = applyGlossary(assembleNote(transcript))
    const field = note.sections.clinical_narrative

    expect(field.text).toContain("hipertensión arterial")
    expect(field.text).toContain("hiperglucemia")
    expect(field.presence).toBe("STATED")
    expect(field.sourceSegmentIds).toEqual(["b1"])
  })
})
