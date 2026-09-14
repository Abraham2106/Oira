import { describe, expect, it } from "vitest"
import { runHeuristicVerification, issue } from "./verification"
import type { StructuringOutput } from "./schema"

const SEGMENTS = [
  { id: "seg-1", startMs: 0, text: "Dolor de rodilla izquierda de tres días." },
  { id: "seg-2", startMs: 4000, text: "Refiere dolor al subir escaleras." },
]

function makeOutput(sections: Record<string, { presence: string; text: string; sourceSegmentIds: string[] }>): StructuringOutput {
  return { sections: sections as StructuringOutput["sections"] }
}

describe("structure/verification", () => {
  it("pasa sin issues cuando el borrador es coherente", () => {
    const output = makeOutput({
      visit_context: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
      clinical_narrative: { presence: "STATED", text: "Dolor de rodilla izquierda", sourceSegmentIds: ["seg-1"] },
      relevant_history: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
      reported_findings: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
      clinician_documented_assessment: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
      clinician_documented_plan: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
      follow_up: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
    })
    const result = runHeuristicVerification(output, SEGMENTS)
    expect(result.blocking).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("bloquea STATED_WITHOUT_TEXT", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "", sourceSegmentIds: ["seg-1"] },
    })
    const result = runHeuristicVerification(output, SEGMENTS)
    expect(result.blocking.some((i) => i.code === "STATED_WITHOUT_TEXT")).toBe(true)
  })

  it("bloquea UNKNOWN_SOURCE", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-fantasma"] },
    })
    const result = runHeuristicVerification(output, SEGMENTS)
    expect(result.blocking.some((i) => i.code === "UNKNOWN_SOURCE")).toBe(true)
  })

  it("advierte con CITATION_MISMATCH en vez de bloquear", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "Meningitis", sourceSegmentIds: ["seg-1"] },
    })
    const result = runHeuristicVerification(output, SEGMENTS)
    expect(result.warnings.some((i) => i.code === "CITATION_MISMATCH")).toBe(true)
  })

  it("issue helper construye un GenerationIssue estable", () => {
    const i = issue("UNKNOWN_SOURCE", "clinical_narrative", "test")
    expect(i.code).toBe("UNKNOWN_SOURCE")
    expect(i.sectionId).toBe("clinical_narrative")
    expect(i.message).toBe("test")
  })
})
