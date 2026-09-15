import { describe, expect, it, vi } from "vitest"
import { createInferencePorts } from "./select"
import type { StructuringResult } from "./port"

const structure = vi.fn(async () => ({
  kind: "note" as const,
  note: { sections: {} },
}))

async function noteOf(result: StructuringResult) {
  if (result.kind !== "note") throw new Error("Se esperaba una nota")
  return result.note
}

vi.mock("../qvac/qwen-structuring", () => ({
  createQwenStructuring: vi.fn(() => ({ structure })),
}))

describe("inference ports", () => {
  it("mock transcribe returns synthetic segments without a network SDK", async () => {
    const { transcription, structuring } = createInferencePorts("mock")
    const { segments } = await transcription.transcribe({ filePath: "unused" })
    expect(segments).toHaveLength(3)
    const note = await noteOf(await structuring.structure({ transcript: segments }))
    expect(Object.keys(note.sections)).toHaveLength(7)
  })

  it("wires qvac structuring to the Qwen adapter", async () => {
    const { structuring } = createInferencePorts("qvac")
    await structuring.structure({ transcript: [] })
    expect(structure).toHaveBeenCalled()
  })
})
