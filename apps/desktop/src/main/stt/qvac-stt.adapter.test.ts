import { describe, expect, it } from "vitest"
import type { AudioChunk } from "./stt.types"
import { createQvacSttAdapter } from "./qvac-stt.adapter"

function chunk(sequence: number): AudioChunk {
  return {
    sequence,
    mimeType: "audio/webm",
    bytes: new Uint8Array([9, 8, 7]),
    durationMs: null,
  }
}

describe("main/stt/qvac-stt.adapter", () => {
  it("fails with NOT_IMPLEMENTED while the QVAC engine is not installed", async () => {
    const adapter = createQvacSttAdapter()
    const result = await adapter.transcribe([chunk(0)])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("NOT_IMPLEMENTED")
    expect(result.error.retryable).toBe(false)
    expect(result.error.hint).toContain("qvac")
  })

  it("never returns transcript data regardless of input", async () => {
    const adapter = createQvacSttAdapter()

    for (const chunks of [[], [chunk(1), chunk(2)]]) {
      const result = await adapter.transcribe(chunks)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_IMPLEMENTED")
      }
    }
  })
})
