import { describe, expect, it } from "vitest"
import { collectEvidenceIssues, checkCitationsInSegment } from "./evidence-rules"
import type { StructuringOutput } from "../schema"

const SEGMENTS = [
  { id: "seg-1", startMs: 0, text: "Dolor de rodilla izquierda de tres días." },
  { id: "seg-2", startMs: 4000, text: "Refiere dolor al subir escaleras." },
]

function makeOutput(sections: Record<string, { presence: string; text: string; sourceSegmentIds: string[] }>): StructuringOutput {
  return { sections: sections as StructuringOutput["sections"] }
}

describe("rules/evidence-rules", () => {
  describe("collectEvidenceIssues", () => {
    it("no issues cuando los ids son válidos", () => {
      const output = makeOutput({
        clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-1"] },
      })
      expect(collectEvidenceIssues(output, SEGMENTS)).toHaveLength(0)
    })

    it("marca UNKNOWN_SOURCE para id inexistente", () => {
      const output = makeOutput({
        clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-fantasma"] },
      })
      const issues = collectEvidenceIssues(output, SEGMENTS)
      expect(issues.some((i) => i.code === "UNKNOWN_SOURCE")).toBe(true)
      expect(issues[0].sectionId).toBe("clinical_narrative")
    })

    it("rechaza segmento fantasma mezclado con válido", () => {
      const output = makeOutput({
        clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-1", "seg-fantasma"] },
      })
      const issues = collectEvidenceIssues(output, SEGMENTS)
      expect(issues.filter((i) => i.code === "UNKNOWN_SOURCE")).toHaveLength(1)
    })
  })

  describe("checkCitationsInSegment", () => {
    it("pasa cuando la cita literal se sostiene en el segmento", () => {
      const output = makeOutput({
        clinical_narrative: { presence: "STATED", text: "Dolor de rodilla izquierda", sourceSegmentIds: ["seg-1"] },
      })
      expect(checkCitationsInSegment(output, SEGMENTS)).toHaveLength(0)
    })

    it("marca CITATION_MISMATCH cuando el texto no se sostiene", () => {
      const output = makeOutput({
        clinical_narrative: { presence: "STATED", text: "Meningitis bacteriana", sourceSegmentIds: ["seg-1"] },
      })
      const issues = checkCitationsInSegment(output, SEGMENTS)
      expect(issues.some((i) => i.code === "CITATION_MISMATCH")).toBe(true)
    })
  })
})
