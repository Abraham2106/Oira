import { describe, expect, it } from "vitest"
import { downsampleTo16k, floatToPcmBytes } from "./micCapture"

describe("micCapture pcm helpers", () => {
  it("passthrough when already 16 kHz", () => {
    const input = new Float32Array([0.1, -0.2, 0.3])
    expect(downsampleTo16k(input, 16_000)).toBe(input)
  })

  it("linear-resamples 48 kHz to 16 kHz", () => {
    const input = new Float32Array(48)
    input[0] = 1
    const out = downsampleTo16k(input, 48_000)
    expect(out.length).toBe(16)
    expect(out[0]).toBeCloseTo(1)
  })

  it("encodes even-length PCM bytes", () => {
    const bytes = floatToPcmBytes(new Float32Array([0, 1, -1]))
    expect(bytes.length).toBe(6)
  })
})
