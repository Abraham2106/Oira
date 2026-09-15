import { describe, expect, it } from "vitest"
import { mapSttSegments } from "./qvac-transcript-mapper"

describe("mapSttSegments", () => {
  it("assigns speaker null and ignores append until SDK semantics are confirmed", () => {
    const segments = mapSttSegments([
      {
        id: "seg-1",
        text: "Buenos días.",
        startMs: 0,
        endMs: 1200,
        append: true,
      },
      { text: "Dolor de rodilla.", startMs: 1400 },
      { id: 7, text: "Ibuprofeno.", startMs: 3000 },
    ])

    expect(segments).toEqual([
      {
        id: "seg-1",
        speaker: null,
        startMs: 0,
        text: "Buenos días.",
      },
      {
        id: "seg-2",
        speaker: null,
        startMs: 1400,
        text: "Dolor de rodilla.",
      },
      {
        id: "7",
        speaker: null,
        startMs: 3000,
        text: "Ibuprofeno.",
      },
    ])
    expect(segments.every((segment) => segment.speaker === null)).toBe(true)
  })

  it("rounds fractional Whisper timestamps to integer milliseconds", () => {
    const segments = mapSttSegments([
      { id: "w1", text: "Hola.", startMs: 12.4 },
      { id: "w2", text: "Adiós.", startMs: 1400.72 },
    ])
    expect(segments.map((segment) => segment.startMs)).toEqual([12, 1401])
  })
})
