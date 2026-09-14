import { describe, expect, it } from "vitest"
import { validateStructuringOutput } from "./schema"

const KNOWN = ["seg-1", "seg-2"]

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
})
