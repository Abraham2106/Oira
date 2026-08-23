import { describe, expect, it } from "vitest"
import { transcriptSegmentSchema } from "./clinical.schema"

describe("transcriptSegmentSchema", () => {
  it("accepts a P0 segment with no speaker role", () => {
    expect(
      transcriptSegmentSchema.parse({
        id: "seg-1",
        speaker: null,
        startMs: 0,
        text: "consulta sintética",
      }).speaker,
    ).toBeNull()
  })

  it("still accepts fixture roles", () => {
    expect(
      transcriptSegmentSchema.parse({
        id: "seg-1",
        speaker: "Médico",
        startMs: 0,
        text: "hola",
      }).speaker,
    ).toBe("Médico")
  })
})
