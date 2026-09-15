import { describe, expect, it } from "vitest"
import { createHeuristicStructuring } from "./heuristic-structuring"

describe("createHeuristicStructuring", () => {
  it("routes spoken text without loading an LLM", async () => {
    const structuring = createHeuristicStructuring()
    const result = await structuring.structure({
      transcript: [
        {
          id: "seg-live",
          speaker: null,
          startMs: 0,
          text: "Me duele la rodilla.",
        },
      ],
    })
    expect(result.kind).toBe("note")
    if (result.kind !== "note") return
    const { note } = result
    expect(note.sections.clinical_narrative.text).toBe("Me duele la rodilla.")
    expect(note.sections.clinical_narrative.sourceSegmentIds).toEqual(["seg-live"])
    expect(note.sections.follow_up.presence).toBe("NOT_STATED")
    expect(note.sections.visit_context.presence).toBe("NOT_STATED")
  })
})
