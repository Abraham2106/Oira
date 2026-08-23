import type { StructuredClinicalFacts } from "../../shared/schemas/clinical.schema"

const SECTIONS: { key: keyof StructuredClinicalFacts; title: string }[] = [
  { key: "visitContext", title: "Contexto" },
  { key: "clinicalNarrative", title: "Narrativa" },
  { key: "relevantHistory", title: "Antecedentes" },
  { key: "reportedFindings", title: "Hallazgos" },
  { key: "assessment", title: "Valoración" },
  { key: "plan", title: "Plan" },
  { key: "followUp", title: "Seguimiento" },
]

export function renderDraftBody(facts: StructuredClinicalFacts): string {
  const lines: string[] = []
  for (const section of SECTIONS) {
    const fact = facts[section.key]
    if (!fact?.text) continue
    lines.push(`${section.title}\n${fact.text}`)
  }
  return lines.join("\n\n")
}
