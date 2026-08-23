import { SECTION_IDS } from "@notalocal/types"
import { describe, expect, it, vi } from "vitest"
import { createQvacStructuring } from "./structuring"

function emptyField() {
  return { text: "", presence: "NOT_STATED" as const, sourceSegmentIds: [] }
}

function sampleNote() {
  return {
    sections: {
      visit_context: {
        text: "Dolor de rodilla.",
        presence: "STATED",
        sourceSegmentIds: ["seg-1"],
      },
      clinical_narrative: {
        text: "Dolor de rodilla.",
        presence: "STATED",
        sourceSegmentIds: ["seg-1"],
      },
      relevant_history: emptyField(),
      reported_findings: emptyField(),
      clinician_documented_assessment: emptyField(),
      clinician_documented_plan: emptyField(),
      follow_up: emptyField(),
    },
  }
}

vi.mock("./sdk", () => ({
  loadModel: vi.fn(async () => "llm-1"),
  completion: vi.fn(() => ({
    events: (async function* () {})(),
    final: Promise.resolve({ contentText: JSON.stringify(sampleNote()) }),
  })),
  unloadModel: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  QWEN3_600M_INST_Q4: { name: "QWEN3_600M_INST_Q4" },
}))

describe("createQvacStructuring", () => {
  it("loadModel → completion json_schema → unloadModel → close", async () => {
    const sdk = await import("./sdk")
    const port = createQvacStructuring()
    const { note } = await port.structure({
      transcript: [
        { id: "seg-1", speaker: null, startMs: 0, text: "Dolor de rodilla." },
      ],
    })
    expect(note.sections.visit_context.text).toBe("Dolor de rodilla.")
    expect(note.sections.visit_context.reviewed).toBe(false)
    expect(note.sections.visit_context.presence).toBe("STATED")
    expect(Object.keys(note.sections)).toHaveLength(SECTION_IDS.length)
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(sdk.completion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "llm-1",
        kvCache: false,
        responseFormat: expect.objectContaining({ type: "json_schema" }),
      }),
    )
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "llm-1" })
    expect(sdk.close).toHaveBeenCalledOnce()
  })

  it("maps invalid JSON to INVALID_STRUCTURED_OUTPUT", async () => {
    const sdk = await import("./sdk")
    vi.mocked(sdk.completion).mockReturnValueOnce({
      events: (async function* () {})(),
      final: Promise.resolve({ contentText: "not-json" }),
    } as never)
    const port = createQvacStructuring()
    await expect(
      port.structure({
        transcript: [{ id: "seg-1", speaker: null, startMs: 0, text: "Hola." }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURED_OUTPUT" })
  })
})
