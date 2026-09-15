import { describe, expect, it } from "vitest"
import { detectSubjectShift, detectTenseShift } from "./subject-time-rules"

describe("rules/subject-time-rules", () => {
  describe("detectSubjectShift", () => {
    it("marca SUBJECT_SHIFT cuando borrador atribuye al paciente antecedente familiar", () => {
      const result = detectSubjectShift(
        "El paciente tiene antecedente de diabetes.",
        "Su madre tiene diabetes.",
        "relevant_history",
      )
      expect(result?.code).toBe("SUBJECT_SHIFT")
    })

    it("no marca cuando ambos se refieren al paciente", () => {
      const result = detectSubjectShift(
        "El paciente tiene diabetes.",
        "Yo tengo diabetes.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando la fuente no menciona familiar", () => {
      const result = detectSubjectShift(
        "El paciente tiene diabetes.",
        "El paciente refiere dolor abdominal.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectTenseShift", () => {
    it("marca TENSE_SHIFT cuando borrador usa presente y fuente usa pasado", () => {
      const result = detectTenseShift(
        "El paciente tiene diabetes.", // presente
        "El paciente tuvo diabetes.", // pasado
        "relevant_history",
      )
      expect(result?.code).toBe("TENSE_SHIFT")
    })

    it("marca TENSE_SHIFT cuando borrador usa pasado y fuente usa presente", () => {
      const result = detectTenseShift(
        "El paciente tuvo diabetes.", // pasado
        "El paciente tiene diabetes.", // presente
        "relevant_history",
      )
      expect(result?.code).toBe("TENSE_SHIFT")
    })

    it("no marca cuando ambos usan mismo tiempo", () => {
      const result = detectTenseShift(
        "El paciente tiene diabetes.",
        "Yo tengo diabetes.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando ambos usan pasado", () => {
      const result = detectTenseShift(
        "El paciente tuvo diabetes.",
        "El paciente tuvo diabetes.",
        "relevant_history",
      )
      expect(result).toBeUndefined()
    })
  })
})