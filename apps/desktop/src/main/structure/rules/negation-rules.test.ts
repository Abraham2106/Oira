import { describe, expect, it } from "vitest"
import {
  detectNegationFlip,
  detectInventedNegation,
  detectNegationScopeShift,
} from "./negation-rules"

describe("rules/negation-rules", () => {
  describe("detectNegationFlip", () => {
    it("marca NEGATION_FLIP cuando el borrador afirma 'descarta' y la fuente dice 'no descarta'", () => {
      const result = detectNegationFlip(
        "Se descarta meningitis.", // borrador: afirma (descarta)
        "No se descarta meningitis.", // fuente: niega (no descarta)
        "clinical_narrative",
      )
      expect(result?.code).toBe("NEGATION_FLIP")
    })

    it("no marca cuando ambos dicen 'no descarta'", () => {
      const result = detectNegationFlip(
        "No se descarta meningitis.",
        "No se descarta meningitis.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca cuando la fuente no tiene 'descarta' simple", () => {
      const result = detectNegationFlip(
        "Se descarta meningitis.",
        "El paciente refiere dolor.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectInventedNegation", () => {
    it("advierte INVENTED_NEGATION cuando el borrador niega sin base en la fuente", () => {
      const result = detectInventedNegation(
        "No hay fiebre.",
        "El paciente refiere dolor de rodilla.",
        "clinical_narrative",
      )
      expect(result?.code).toBe("INVENTED_NEGATION")
    })

    it("no marca si la fuente también niega", () => {
      const result = detectInventedNegation(
        "No hay fiebre.",
        "El paciente niega fiebre.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })

    it("no marca si el borrador no niega", () => {
      const result = detectInventedNegation(
        "El paciente tiene fiebre.",
        "El paciente refiere dolor de rodilla.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("detectNegationScopeShift", () => {
    it("marca NEGATION_SCOPE_SHIFT en el contraejemplo 'no descarta herramientas'", () => {
      const result = detectNegationScopeShift(
        "No se descarta herramientas diagnósticas.",
        "No se descarta meningitis.",
        "clinical_narrative",
      )
      expect(result?.code).toBe("NEGATION_SCOPE_SHIFT")
    })

    it("no marca cuando la fuente no usa 'no descarta'", () => {
      const result = detectNegationScopeShift(
        "No se descarta herramientas.",
        "El paciente refiere dolor.",
        "clinical_narrative",
      )
      expect(result).toBeUndefined()
    })
  })
})