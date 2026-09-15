import { describe, expect, it } from "vitest"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import { buildReviewPrompt, REVIEW_PROMPT_VERSION } from "./review-prompt"

describe("buildReviewPrompt", () => {
  const transcript = SYNTHETIC_TRANSCRIPT.map((s) => ({ id: s.id, text: s.text }))
  const note = syntheticClinicalNote().sections as Record<
    string,
    { presence: string; text: string; sourceSegmentIds: string[] }
  >

  it("incluye la transcripción original con IDs de segmento", () => {
    const prompt = buildReviewPrompt(transcript, note)
    expect(prompt).toContain("TRANSCRIPCIÓN ORIGINAL")
    expect(prompt).toContain("[seg-1]")
    expect(prompt).toContain("[seg-2]")
    expect(prompt).toContain("Dolor de rodilla izquierda desde hace tres días")
  })

  it("incluye solo secciones STATED con texto, con sus fuentes", () => {
    const prompt = buildReviewPrompt(transcript, note)
    expect(prompt).toContain("SECCIÓN: clinical_narrative")
    expect(prompt).toContain("FUENTES: seg-2")
    // La sección vacía NOT_STATED no aparece en el prompt de auditoría.
    expect(prompt).not.toContain("SECCIÓN: relevant_history")
  })

  it("fija el rol de auditor y prohíbe reescribir o aceptar", () => {
    const prompt = buildReviewPrompt(transcript, note)
    expect(prompt).toContain("auditor clínico")
    expect(prompt).toContain("No reescribas, no completes, no aceptes la nota.")
    expect(prompt).toContain("FORMATO DE SALIDA")
  })

  it("expone una versión estable para trazabilidad", () => {
    expect(typeof REVIEW_PROMPT_VERSION).toBe("string")
    expect(REVIEW_PROMPT_VERSION.length).toBeGreaterThan(0)
  })
})