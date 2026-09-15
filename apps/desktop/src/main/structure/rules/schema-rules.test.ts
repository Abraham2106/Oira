import { describe, expect, it } from "vitest"
import { validateSchemaRules } from "./schema-rules"
import type { StructuringOutput } from "../schema"

function makeOutput(sections: Partial<Record<string, { presence: string; text: string }>>): StructuringOutput {
  const empty = { presence: "NOT_STATED", text: "", sourceSegmentIds: [] }
  const sectionsMap: Record<string, { presence: string; text: string; sourceSegmentIds: string[] }> = {
    visit_context: empty,
    clinical_narrative: empty,
    relevant_history: empty,
    reported_findings: empty,
    clinician_documented_assessment: empty,
    clinician_documented_plan: empty,
    follow_up: empty,
    ...sections,
  }
  return { sections: sectionsMap as StructuringOutput["sections"] }
}

describe("rules/schema-rules", () => {
  it("no issues cuando todas las secciones STATED con texto", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "Dolor." },
      visit_context: { presence: "STATED", text: "Control." },
    })
    expect(validateSchemaRules(output)).toHaveLength(0)
  })

  it("marca STATED_WITHOUT_TEXT para sección STATED sin texto", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "" },
    })
    const issues = validateSchemaRules(output)
    expect(issues.some((i) => i.code === "STATED_WITHOUT_TEXT")).toBe(true)
    expect(issues.some((i) => i.sectionId === "clinical_narrative")).toBe(true)
  })

  it("no marca NOT_STATED como error", () => {
    const output = makeOutput({
      clinical_narrative: { presence: "STATED", text: "Dolor." },
      follow_up: { presence: "NOT_STATED", text: "" },
    })
    const issues = validateSchemaRules(output)
    expect(issues.some((i) => i.code === "MISSING_SECTION")).toBe(false)
  })

  it("marca MISSING_SECTION si una sección falta del todo", () => {
    const output = { sections: {} } as StructuringOutput
    const issues = validateSchemaRules(output)
    expect(issues.some((i) => i.code === "MISSING_SECTION")).toBe(true)
  })
})
