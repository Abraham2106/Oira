import { afterEach, describe, expect, it, vi } from "vitest"
import { createQvacTranscription } from "./transcription"

vi.mock("./sdk", () => ({
  loadModel: vi.fn(async () => "model-1"),
  transcribe: vi.fn(async () => [
    { id: "w1", text: "Hola.", startMs: 0, endMs: 800, append: false },
  ]),
  unloadModel: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  WHISPER_SMALL_Q8_0: { name: "WHISPER_SMALL_Q8_0" },
}))

afterEach(() => {
  vi.useRealTimers()
})

type LoadOptions = { onProgress?: (update: unknown) => void }

function stubLoadModelOnce(
  sdk: typeof import("./sdk"),
  impl: (options: LoadOptions) => Promise<string>,
): void {
  const loose = sdk.loadModel as unknown as {
    mockImplementationOnce: (next: unknown) => void
  }
  loose.mockImplementationOnce(impl)
}

describe("createQvacTranscription", () => {
  it("loadModel → transcribe → unloadModel → close", async () => {
    const sdk = await import("./sdk")
    const port = createQvacTranscription()
    const { segments } = await port.transcribe({ filePath: "C:/tmp/capture.wav" })
    expect(segments).toEqual([
      { id: "w1", speaker: null, startMs: 0, text: "Hola." },
    ])
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(sdk.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "model-1",
        audioChunk: "C:/tmp/capture.wav",
        metadata: true,
      }),
    )
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "model-1" })
    expect(sdk.close).toHaveBeenCalledOnce()
  })

  it("rejects an empty path without touching the SDK", async () => {
    const sdk = await import("./sdk")
    vi.mocked(sdk.loadModel).mockClear()
    const port = createQvacTranscription()
    await expect(port.transcribe({ filePath: "" })).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
    })
    expect(sdk.loadModel).not.toHaveBeenCalled()
  })

  it("keeps loading past 120s while progress events keep arriving", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      let emitProgress: () => void = () => {}
      let finishLoad: () => void = () => {}
      stubLoadModelOnce(sdk, (options) => {
        return new Promise<string>((resolve) => {
          emitProgress = () =>
            options.onProgress?.({
              type: "modelProgress",
              downloaded: 1,
              total: 100,
              percentage: 1,
              downloadKey: "k",
            })
          finishLoad = () => resolve("model-slow")
        })
      })
      const port = createQvacTranscription()
      const pending = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const done = expect(pending).resolves.toEqual({
        segments: [{ id: "w1", speaker: null, startMs: 0, text: "Hola." }],
      })

      await vi.advanceTimersByTimeAsync(119_000)
      emitProgress()
      await vi.advanceTimersByTimeAsync(119_000)
      emitProgress()
      await vi.advanceTimersByTimeAsync(60_000)
      finishLoad()
      await done
      expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "model-slow" })
    } finally {
      vi.useRealTimers()
    }
  })

  it("fails with LOAD_WATCHDOG when loading stalls without progress", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      stubLoadModelOnce(sdk, () => new Promise<string>(() => {}))
      const port = createQvacTranscription()
      const pending = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const assertion = expect(pending).rejects.toMatchObject({
        code: "TRANSCRIPTION_FAILED",
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(120_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
