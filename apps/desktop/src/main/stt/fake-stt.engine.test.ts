import { afterEach, describe, expect, it, vi } from "vitest"
import type { AudioChunk } from "./stt.types"
import { createFakeSttEngine } from "./fake-stt.engine"
import { SYNTHETIC_TRANSCRIPT } from "../../shared/fixtures/synthetic-consult"

function chunk(sequence: number): AudioChunk {
  return {
    sequence,
    mimeType: "audio/webm",
    bytes: new Uint8Array([1, 2, sequence]),
    durationMs: 1500,
  }
}

describe("main/stt/fake-stt.engine", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the synthetic transcript deterministically for identical chunks", async () => {
    const engine = createFakeSttEngine()
    const first = await engine.transcribe([chunk(0)])
    const second = await engine.transcribe([chunk(0)])

    expect(first.ok).toBe(true)
    expect(second).toEqual(first)
    if (!first.ok) return
    expect(first.data).toEqual(SYNTHETIC_TRANSCRIPT)
    expect(first.data.map((segment) => segment.id)).toEqual([
      "seg-1",
      "seg-2",
      "seg-3",
    ])
    expect(first.data.every((segment) => segment.speaker === "Médico" || segment.speaker === "Paciente")).toBe(true)
  })

  it("isolates results so callers cannot corrupt shared fixture state", async () => {
    const engine = createFakeSttEngine()
    const first = await engine.transcribe([chunk(1)])
    if (!first.ok) return
    first.data.pop()
    first.data[0].text = "mutated"

    const second = await engine.transcribe([chunk(1)])
    expect(second).toEqual({
      ok: true,
      data: SYNTHETIC_TRANSCRIPT.map((segment) => ({ ...segment })),
    })
  })

  it("fails with INVALID_INPUT when no chunks are provided", async () => {
    const engine = createFakeSttEngine()
    const result = await engine.transcribe([])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("INVALID_INPUT")
    expect(result.error.retryable).toBe(false)
    expect(typeof result.error.message).toBe("string")
  })

  it("honors simulated latency deterministically under fake timers", async () => {
    vi.useFakeTimers()
    const engine = createFakeSttEngine({ latencyMs: 25 })

    let settled = false
    const pending = engine.transcribe([chunk(2)]).then((result) => {
      settled = true
      return result
    })

    await vi.advanceTimersByTimeAsync(10)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(15)
    const result = await pending
    expect(result.ok).toBe(true)
  })
})
