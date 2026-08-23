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

  it("qvac wires distinct on-device adapters without calling the SDK", () => {
    const mock = createInferencePorts("mock")
    const qvac = createInferencePorts("qvac")
    expect(qvac.transcription.transcribe).not.toBe(mock.transcription.transcribe)
    expect(qvac.structuring.structure).not.toBe(mock.structuring.structure)
  })
})
