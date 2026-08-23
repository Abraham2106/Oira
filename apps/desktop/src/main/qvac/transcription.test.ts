import { describe, expect, it, vi } from "vitest"
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
})
