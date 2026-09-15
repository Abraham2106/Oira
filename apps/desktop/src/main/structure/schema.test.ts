import { describe, expect, it } from "vitest"
import {
  validateCompleteStructuringOutput,
  validateStructuringOutput,
} from "./schema"

const KNOWN = ["seg-1", "seg-2"]

function completeSections(overrides: Record<string, unknown> = {}) {
  const empty = { presence: "NOT_STATED", text: "", sourceSegmentIds: [] }
  return {
    sections: {
      visit_context: empty,
      clinical_narrative: empty,
      relevant_history: empty,
      reported_findings: empty,
      clinician_documented_assessment: empty,
      clinician_documented_plan: empty,
      follow_up: empty,
      ...overrides,
    },
  }
}

const VALID = {
  sections: {
    clinical_narrative: {
      presence: "STATED",
      text: "Dolor de rodilla.",
      sourceSegmentIds: ["seg-1"],
    },
    relevant_history: {
      presence: "NOT_STATED",
      text: "",
      sourceSegmentIds: [],
    },
  },
}

describe("main/structure/schema", () => {
  it("acepta una salida válida", () => {
    const result = validateStructuringOutput(VALID, KNOWN)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.text).toBe(
        "Dolor de rodilla.",
      )
    }
  })

  it("rechaza secciones desconocidas en lugar de descartarlas", () => {
    const result = validateStructuringOutput(
      { sections: {
        inventada: { presence: "STATED", text: "x", sourceSegmentIds: [] },
        clinical_narrative: { presence: "STATED", text: "Dolor.", sourceSegmentIds: ["seg-1"] },
      } },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza segmentos fantasma sin sanear la evidencia", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: {
            presence: "STATED",
            text: "x",
            sourceSegmentIds: ["seg-fantasma", "seg-1"],
          },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza STATED vacío en lugar de convertirlo a NOT_STATED", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: { presence: "STATED", text: "   ", sourceSegmentIds: ["seg-1"] },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza NOT_STATED que trae texto", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          follow_up: { presence: "NOT_STATED", text: "algo", sourceSegmentIds: [] },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("preserva UNKNOWN con texto", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: {
            presence: "UNKNOWN",
            text: "Afirmó y negó falta de aire.",
            sourceSegmentIds: ["seg-1"],
          },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sections.clinical_narrative?.presence).toBe("UNKNOWN")
      expect(result.value.sections.clinical_narrative?.text).toBe(
        "Afirmó y negó falta de aire.",
      )
      expect(result.value.sections.clinical_narrative?.sourceSegmentIds).toEqual([
        "seg-1",
      ])
    }
  })

  it("rechaza strings planos que no aportan evidencia", () => {
    const result = validateStructuringOutput(
      { clinical_narrative: "Dolor de rodilla." },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza JSON plano de strings por sección", () => {
    const result = validateStructuringOutput(
      {
        visit_context: "Control.",
        clinical_narrative: "Dolor de rodilla.",
      },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza objetos vacíos o secciones con forma inválida", () => {
    expect(validateStructuringOutput({}, KNOWN).ok).toBe(false)
    expect(validateStructuringOutput({ desconocida: "texto" }, KNOWN).ok).toBe(false)
    expect(validateStructuringOutput({
      sections: { clinical_narrative: { presence: "NOT_STATED", text: "texto", sourceSegmentIds: ["seg-ghost"] } },
    }, KNOWN).ok).toBe(false)
  })

  describe("validateCompleteStructuringOutput (contrato estricto F1)", () => {
    it("acepta las 7 secciones presentes y válidas", () => {
      const result = validateCompleteStructuringOutput(
        completeSections({
          clinical_narrative: {
            presence: "STATED",
            text: "Dolor.",
            sourceSegmentIds: ["seg-1"],
          },
        }),
        KNOWN,
      )
      expect(result.ok).toBe(true)
    })

    it("rechaza con MISSING_SECTION cuando falta una sección", () => {
      const result = validateCompleteStructuringOutput(
        {
          sections: {
            visit_context: { presence: "STATED", text: "x", sourceSegmentIds: ["seg-1"] },
            clinical_narrative: { presence: "STATED", text: "x", sourceSegmentIds: ["seg-1"] },
            relevant_history: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
            reported_findings: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
            clinician_documented_assessment: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
            clinician_documented_plan: { presence: "NOT_STATED", text: "", sourceSegmentIds: [] },
          },
        },
        KNOWN,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.map((issue) => issue.code)).toContain("MISSING_SECTION")
        expect(result.issues.find((issue) => issue.code === "MISSING_SECTION")?.sectionId).toBe(
          "follow_up",
        )
      }
    })

    it("rechaza STATED sin texto y NOT_STATED con texto (códigos estables)", () => {
      const result = validateCompleteStructuringOutput(
        completeSections({
          clinical_narrative: { presence: "STATED", text: "  ", sourceSegmentIds: ["seg-1"] },
          follow_up: { presence: "NOT_STATED", text: "algo", sourceSegmentIds: [] },
        }),
        KNOWN,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        const codes = result.issues.map((issue) => issue.code)
        expect(codes).toContain("STATED_WITHOUT_TEXT")
        expect(codes).toContain("NOT_STATED_WITH_TEXT")
      }
    })

    it("rechaza segmentos inexistentes con INVALID_SOURCE_ID", () => {
      const result = validateCompleteStructuringOutput(
        completeSections({
          clinical_narrative: {
            presence: "STATED",
            text: "Dolor.",
            sourceSegmentIds: ["seg-fantasma", "seg-1"],
          },
        }),
        KNOWN,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        const issue = result.issues.find((item) => item.code === "INVALID_SOURCE_ID")
        expect(issue).toBeDefined()
        expect(issue?.message).toContain("seg-fantasma")
      }
    })

    it("rechaza presence inválido con INVALID_PRESENCE", () => {
      const result = validateCompleteStructuringOutput(
        completeSections({
          clinical_narrative: { text: "Dolor.", sourceSegmentIds: [] } as never,
        }),
        KNOWN,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.map((issue) => issue.code)).toContain("INVALID_PRESENCE")
      }
    })

    it("rechaza salida vacía o sin objeto con EMPTY_OUTPUT", () => {
      expect(validateCompleteStructuringOutput(null, KNOWN).ok).toBe(false)
      expect(validateCompleteStructuringOutput("texto", KNOWN).ok).toBe(false)
      const result = validateCompleteStructuringOutput({ sections: {} }, KNOWN)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.map((issue) => issue.code)).toContain("EMPTY_OUTPUT")
      }
    })
  })
})
