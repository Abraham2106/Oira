import { SECTION_IDS } from "@notalocal/types"
import { beforeEach, describe, expect, it, vi } from "vitest"
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
  QWEN3_1_7B_INST_Q4: { name: "QWEN3_1_7B_INST_Q4" },
  QWEN3_4B_INST_Q4_K_M: { name: "QWEN3_4B_INST_Q4_K_M" },
}))

describe("createQvacStructuring", () => {
  beforeEach(() => {
    delete process.env.NOTALOCAL_LLM
  })

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
    expect(sdk.loadModel).toHaveBeenCalledWith(
      expect.objectContaining({
        modelSrc: expect.objectContaining({ name: "QWEN3_1_7B_INST_Q4" }),
      }),
    )
    expect(sdk.completion).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "llm-1",
        kvCache: false,
        responseFormat: expect.objectContaining({ type: "json_schema" }),
        generationParams: expect.objectContaining({ predict: 2048 }),
      }),
    )
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "llm-1" })
    expect(sdk.close).toHaveBeenCalledOnce()
  })

  it("collapses a dumped sentence into visit_context and clinical_narrative", async () => {
    const sdk = await import("./sdk")
    const dumped = "Hola doctor, me duele la rodilla izquierda desde ayer."
    const field = {
      text: dumped,
      presence: "NOT_STATED",
      sourceSegmentIds: ["seg-1", "seg-2"],
    }
    vi.mocked(sdk.completion).mockReturnValueOnce({
      events: (async function* () {})(),
      final: Promise.resolve({
        contentText: JSON.stringify({
          sections: {
            visit_context: field,
            clinical_narrative: field,
            relevant_history: field,
            reported_findings: field,
            clinician_documented_assessment: field,
            clinician_documented_plan: field,
            follow_up: field,
          },
        }),
      }),
    } as never)
    const port = createQvacStructuring()
    const { note } = await port.structure({
      transcript: [
        { id: "seg-1", speaker: null, startMs: 0, text: dumped },
        { id: "seg-2", speaker: null, startMs: 1000, text: "No me caí." },
      ],
    })
    expect(note.sections.visit_context.presence).toBe("STATED")
    expect(note.sections.visit_context.text).toContain("rodilla")
    expect(note.sections.clinical_narrative.text).toContain("caí")
    expect(note.sections.relevant_history.text).toBe("")
    expect(note.sections.clinician_documented_assessment.presence).toBe("NOT_STATED")
    expect(note.sections.clinician_documented_plan.text).toBe("")
    expect(note.sections.follow_up.text).toBe("")
  })

  it("clears relevant_history when it copies visit_context", async () => {
    const sdk = await import("./sdk")
    vi.mocked(sdk.completion).mockReturnValueOnce({
      events: (async function* () {})(),
      final: Promise.resolve({
        contentText: JSON.stringify({
          sections: {
            visit_context: {
              text: "Hola doctor, me duele la rodilla izquierda desde ayer.",
              presence: "STATED",
              sourceSegmentIds: ["seg-1"],
            },
            clinical_narrative: {
              text: "No me caí, apareció al caminar.",
              presence: "STATED",
              sourceSegmentIds: ["seg-2"],
            },
            relevant_history: {
              text: "Hola doctor, me duele la rodilla izquierda desde ayer.",
              presence: "STATED",
              sourceSegmentIds: ["seg-1"],
            },
            reported_findings: emptyField(),
            clinician_documented_assessment: emptyField(),
            clinician_documented_plan: emptyField(),
            follow_up: emptyField(),
          },
        }),
      }),
    } as never)
    const port = createQvacStructuring()
    const { note } = await port.structure({
      transcript: [
        { id: "seg-1", speaker: null, startMs: 0, text: "Hola doctor, me duele la rodilla izquierda desde ayer." },
        { id: "seg-2", speaker: null, startMs: 1000, text: "No me caí, apareció al caminar." },
      ],
    })
    expect(note.sections.clinical_narrative.text).toContain("caminar")
    expect(note.sections.relevant_history.text).toBe("")
    expect(note.sections.relevant_history.presence).toBe("NOT_STATED")
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

  it("loads 4B instruct when NOTALOCAL_LLM selects it", async () => {
    const previous = process.env.NOTALOCAL_LLM
    process.env.NOTALOCAL_LLM = "QWEN3_4B_INST_Q4_K_M"
    try {
      const sdk = await import("./sdk")
      vi.mocked(sdk.loadModel).mockClear()
      const port = createQvacStructuring()
      await port.structure({
        transcript: [{ id: "seg-1", speaker: null, startMs: 0, text: "Dolor de rodilla." }],
      })
      expect(sdk.loadModel).toHaveBeenCalledWith(
        expect.objectContaining({
          modelSrc: expect.objectContaining({ name: "QWEN3_4B_INST_Q4_K_M" }),
        }),
      )
    } finally {
      if (previous == null) delete process.env.NOTALOCAL_LLM
      else process.env.NOTALOCAL_LLM = previous
    }
  })
})
