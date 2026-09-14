import { describe, expect, it } from "vitest"
import { verifyMeasurementCitation, verifyUnitConsistency } from "./numbers-units-rules"

describe("rules/numbers-units-rules", () => {
  describe("verifyMeasurementCitation", () => {
    it("no marca una dosis que sí está en la fuente", () => {
      const result = verifyMeasurementCitation(
        "clinical_narrative",
        "Toma 500 mg de paracetamol.",
        "La paciente toma 500 mg de paracetamol cada 8 horas.",
      )
      expect(result).toBeUndefined()
    })

    it("marca UNKNOWN_SOURCE cuando la dosis no está en la fuente", () => {
      const result = verifyMeasurementCitation(
        "clinical_narrative",
        "Toma 600 mg de ibuprofeno.",
        "El paciente menciona dolor de rodilla.",
      )
      expect(result?.code).toBe("UNKNOWN_SOURCE")
    })

    it("no marca si no hay cifra en la fuente (paráfrasis)", () => {
      const result = verifyMeasurementCitation(
        "clinical_narrative",
        "Controla con analgesia.",
        "El paciente refiere dolor.",
      )
      expect(result).toBeUndefined()
    })
  })

  describe("verifyUnitConsistency", () => {
    it("marca UNIT_MISMATCH ante misma cifra con unidad distinta", () => {
      const issues = verifyUnitConsistency(
        "2 mg de lorazepam.",
        "2 g de lorazepam.",
        "clinical_narrative",
      )
      expect(issues.some((i) => i.code === "UNIT_MISMATCH")).toBe(true)
    })

    it("no marca unidades idénticas ni conversiones equivalentes", () => {
      // Misma cifra y misma unidad: sin conflicto.
      expect(verifyUnitConsistency("2 mg de lorazepam.", "2 mg de lorazepam.", "clinical_narrative")).toHaveLength(0)
      // Conversión equivalente: cifra distinta (2 g → 2000 mg), no matchea por número.
      expect(verifyUnitConsistency("2000 mg de lorazepam.", "2 g de lorazepam.", "clinical_narrative")).toHaveLength(0)
      // Cifra sin unidad en el borrador no activa la regla de unidad.
      expect(verifyUnitConsistency("Toma 2.", "2 g de lorazepam.", "clinical_narrative")).toHaveLength(0)
    })
  })
})