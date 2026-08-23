import { describe, expect, it } from "vitest"
import { createInferencePorts } from "./select"

describe("inference ports", () => {
  it("mock transcribe returns synthetic segments without a network SDK", async () => {
    const { transcription, structuring } = createInferencePorts("mock")
    const { segments } = await transcription.transcribe({ filePath: "unused" })
    expect(segments).toHaveLength(3)
    const { note } = await structuring.structure({ transcript: segments })
    expect(Object.keys(note.sections)).toHaveLength(7)
  })

  it("qvac structuring drafts from the spoken transcript without loading an LLM", async () => {
    const { structuring } = createInferencePorts("qvac")
    const { note } = await structuring.structure({
      transcript: [
        { id: "seg-live", speaker: null, startMs: 0, text: "Me duele la rodilla." },
      ],
    })
    expect(note.sections.clinical_narrative.text).toBe("Me duele la rodilla.")
    expect(note.sections.clinical_narrative.sourceSegmentIds).toEqual(["seg-live"])
    expect(note.sections.follow_up.presence).toBe("NOT_STATED")
  })
})
