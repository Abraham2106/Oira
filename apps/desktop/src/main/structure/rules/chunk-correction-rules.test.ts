import { describe, expect, it } from "vitest"
import {
  detectDuplicateSections,
  detectCorrectionConflict,
  detectSelfContradiction,
} from "./chunk-correction-rules"

describe("rules/chunk-correction-rules", () => {
  describe("detectDuplicateSections", () => {
    it("marca DUPLICATE_SECTION cuando hay secciones idénticas", () => {
      const sections = [
        { id: "clinical_narrative" as const, text: "Dolor abdominal." },
        { id: "clinical_narrative" as const, text: "Dolor abdominal." },
      ]
      const issues = detectDuplicateSections(sections)
      expect(issues.some((i) => i.code === "DUPLICATE_SECTION")).toBe(true)
    })

    it("no marca secciones distintas aunque tengan texto similar", () => {
      const sections = [
        { id: "clinical_narrative" as const, text: "Dolor abdominal." },
        { id: "clinician_documented_plan" as const, text: "Dolor abdominal intenso." },
      ]
      const issues = detectDuplicateSections(sections)
      expect(issues).toHaveLength(0)
    })

    it("no marca cuando no hay duplicados", () => {
      const sections = [
        { id: "clinical_narrative" as const, text: "Dolor abdominal." },
        { id: "clinician_documented_plan" as const, text: "Analgesia." },
      ]
      const issues = detectDuplicateSections(sections)
      expect(issues).toHaveLength(0)
    })
  })

  describe("detectCorrectionConflict", () => {
    it("marca CHUNK_CORRECTION cuando el borrador usa marcadores de autocorrección", () => {
      const result = detectCorrectionConflict(
        "Dijo 100, pero en realidad 200 mg.",
        "El paciente refiere dosis variable.",
        "clinical_narrative",
      )
      expect(result?.code).toBe("CHUNK_CORRECTION")
    })

    it("no marca cuando no hay autocorrección en el borrador", () => {
      const result = detectCorrectionConflict(
        "Toma 200 mg de ibuprofeno.",
        "El paciente refiere dosis variable.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectSelfContradiction", () => {
    it("marca SELF_CONTRADICTION cuando el borrador se contradice internamente", () => {
      const result = detectSelfContradiction(
        "El paciente tiene diabetes. El paciente no tiene diabetes.",
        "clinical_narrative",
      )
      expect(result?.code).toBe("SELF_CONTRADICTION")
    })

    it("no marca cuando el borrador es consistente", () => {
      const result = detectSelfContradiction(
        "El paciente tiene diabetes. Controla con metformina.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca afirmaciones cortas no contradictorias", () => {
      const result = detectSelfContradiction(
        "Dolor abdominal.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })
})