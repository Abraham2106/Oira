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

  it("rechaza secciones desconocidas", () => {
    const result = validateStructuringOutput(
      { sections: { inventada: { presence: "STATED", text: "x", sourceSegmentIds: [] } } },
      KNOWN,
    )

    expect(result.ok).toBe(false)
  })

  it("rechaza segmentos que no están en la transcripción", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: {
            presence: "STATED",
            text: "x",
            sourceSegmentIds: ["seg-fantasma"],
          },
        },
      },
      KNOWN,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.join(" ")).toContain("seg-fantasma")
    }
  })

  it("rechaza STATED sin texto", () => {
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

  it("rechaza NOT_STATED con contenido", () => {
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
})
