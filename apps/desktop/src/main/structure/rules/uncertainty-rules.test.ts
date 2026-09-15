import { describe, expect, it } from "vitest"
import { detectCertaintyEscalation, detectInventedCertainty } from "./uncertainty-rules"

describe("rules/uncertainty-rules", () => {
  describe("detectCertaintyEscalation", () => {
    it("marca UNCERTAINTY_LOST cuando borrador afirma lo que fuente deja en duda", () => {
      const result = detectCertaintyEscalation(
        "El paciente tiene neumonía.", // certeza
        "Posible neumonía basal.", // incertidumbre
        "clinical_narrative",
      )
      expect(result?.code).toBe("UNCERTAINTY_LOST")
    })

    it("no marca cuando la fuente no expresa incertidumbre", () => {
      const result = detectCertaintyEscalation(
        "El paciente tiene neumonía.",
        "El paciente tiene neumonía.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando ambos expresan incertidumbre", () => {
      const result = detectCertaintyEscalation(
        "Posible neumonía.",
        "Posible neumonía.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando el borrador no tiene certeza", () => {
      const result = detectCertaintyEscalation(
        "Se sospecha neumonía.", // incertidumbre
        "Sospecha de neumonía.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectInventedCertainty", () => {
    it("marca INVENTED_CERTAINTY cuando borrador afirma sin base en fuente", () => {
      const result = detectInventedCertainty(
        "El paciente tiene diabetes.", // certeza
        "El paciente refiere orinar mucho.", // sin certeza ni incertidumbre explícita
        "clinical_narrative",
      )
      expect(result?.code).toBe("INVENTED_CERTAINTY")
    })

    it("no marca cuando la fuente también tiene certeza", () => {
      const result = detectInventedCertainty(
        "El paciente tiene diabetes.",
        "Diagnóstico: diabetes tipo 2.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando la fuente tiene incertidumbre", () => {
      const result = detectInventedCertainty(
        "El paciente tiene diabetes.",
        "Posible diabetes.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando el borrador no tiene certeza", () => {
      const result = detectInventedCertainty(
        "Posible diabetes.", // incertidumbre
        "El paciente refiere orinar mucho.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })
})