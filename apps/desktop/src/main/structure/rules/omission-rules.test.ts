import { describe, expect, it } from "vitest"
import { detectCriticalOmission, detectContradictionBetweenChunks } from "./omission-rules"

describe("rules/omission-rules", () => {
  describe("detectCriticalOmission", () => {
    it("marca OMISSION cuando fuente menciona alergia y borrador la omite", () => {
      const result = detectCriticalOmission(
        "El paciente refiere dolor abdominal.",
        "Paciente alérgico a la penicilina.",
        "relevant_history",
      )
      expect(result?.code).toBe("OMISSION")
    })

    it("no marca cuando ambos mencionan el mismo keyword", () => {
      const result = detectCriticalOmission(
        "Alergia a penicilina.",
        "Paciente alérgico a penicilina.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando la fuente no menciona el keyword", () => {
      const result = detectCriticalOmission(
        "El paciente refiere dolor abdominal.",
        "El paciente menciona dolor abdominal intenso.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })

    it("no marca para secciones sin keywords definidos", () => {
      const result = detectCriticalOmission(
        "Texto del borrador.",
        "Texto de la fuente.",
        undefined,
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectContradictionBetweenChunks", () => {
    it("marca CHUNK_CONTRADICTION cuando chunks se contradicen", () => {
      const chunks = [
        "El paciente tiene diabetes.",
        "El paciente no tiene diabetes.",
      ]
      const issues = detectContradictionBetweenChunks(chunks, "relevant_history")
      expect(issues.some((i) => i.code === "CHUNK_CONTRADICTION")).toBe(true)
    })

    it("no marca cuando los chunks son consistentes", () => {
      const chunks = [
        "El paciente tiene diabetes.",
        "Controla con metformina.",
      ]
      const issues = detectContradictionBetweenChunks(chunks, "relevant_history")
      expect(issues).toHaveLength(0)
    })

    it("no marca cuando no hay tokens que contradigan", () => {
      const chunks = [
        "Dolor abdominal.",
        "Dolor lumbar.",
      ]
      const issues = detectContradictionBetweenChunks(chunks, "reported_findings")
      expect(issues).toHaveLength(0)
    })
  })
})