import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createQvacInferenceRuntime } from "./inference-runtime"
import { createQvacTranscription } from "./transcription"

vi.mock("./sdk", () => ({
  completion: vi.fn(() => ({
    requestId: "completion-1",
    final: Promise.resolve({ contentText: "{}", raw: { fullText: "{}" }, stopReason: "eos" }),
  })),
  cancel: vi.fn(async () => undefined),
  loadModel: vi.fn(async () => "model-1"),
  transcribe: vi.fn(async () => [
    { id: "w1", text: "Hola.", startMs: 0, endMs: 800, append: false },
  ]),
  unloadModel: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  WHISPER_LARGE_V3_TURBO: { name: "WHISPER_LARGE_V3_TURBO" },
  QWEN3_4B_Q4_K_M: { name: "QWEN3_4B_Q4_K_M", expectedSize: 1 },
  getSystemResources: vi.fn(async () => ({ capabilities: { gpus: { status: "supported", value: [
    { id: "test-gpu", name: { status: "supported", value: "NVIDIA RTX 2050" }, drivers: { cuda: { status: "supported", value: true } } },
  ] } } })),
  ContextOverflowError: class ContextOverflowError extends Error {},
}))

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  vi.clearAllMocks()
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

async function flushMicrotasks(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

/**
 * These tests mock `@qvac/sdk`. They do not prove native cancel, close, or
 * Whisper load behavior. That remains a hardware integration check via
 * `pnpm --filter oira-desktop qvac:whisper`.
 */
describe("createQvacTranscription", () => {
  it("keeps Whisper resident until explicit handoff", async () => {
    const sdk = await import("./sdk")
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })
    const port = createQvacTranscription({ runtime })
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
    await port.transcribe({ filePath: "C:/tmp/second.wav" })
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(sdk.unloadModel).not.toHaveBeenCalled()
    await runtime.handoffToStructuring()
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "model-1" })
    await runtime.shutdown()
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

  it("imports the SDK without a memory preflight", async () => {
    const loadSdk = vi.fn(async () => import("./sdk"))
    const port = createQvacTranscription({
      loadSdk,
    })
    await expect(port.transcribe({ filePath: "C:/tmp/capture.wav" })).resolves.toEqual({
      segments: [{ id: "w1", speaker: null, startMs: 0, text: "Hola." }],
    })
    expect(loadSdk).toHaveBeenCalledOnce()
  })

  it("maps SDK import failures to TRANSCRIPTION_FAILED", async () => {
    const port = createQvacTranscription({
      loadSdk: async () => {
        throw new Error("native module missing")
      },
    })
    await expect(
      port.transcribe({ filePath: "C:/tmp/capture.wav" }),
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
      message: "native module missing",
    })
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
      const port = createQvacTranscription({
      })
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
      expect(sdk.unloadModel).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("fails with LOAD_WATCHDOG when loading stalls without progress", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      stubLoadModelOnce(sdk, () => {
        const loading = new Promise<string>(() => {})
        return Object.assign(loading, { requestId: "load-request-1" })
      })
      const port = createQvacTranscription({
      })
      const pending = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const assertion = expect(pending).rejects.toMatchObject({
        code: "TRANSCRIPTION_FAILED",
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(120_000)
      await assertion
      expect(sdk.cancel).toHaveBeenCalledWith({ requestId: "load-request-1" })
      expect(sdk.transcribe).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not restart idle timers after the watchdog settles", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      let emitProgress: () => void = () => {}
      stubLoadModelOnce(sdk, (options) => {
        const loading = new Promise<string>(() => {
          emitProgress = () =>
            options.onProgress?.({
              type: "modelProgress",
              downloaded: 1,
              total: 100,
              percentage: 1,
              downloadKey: "k",
            })
        })
        return Object.assign(loading, { requestId: "load-request-1" })
      })
      const port = createQvacTranscription({
      })
      const pending = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const assertion = expect(pending).rejects.toMatchObject({
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(120_000)
      await assertion
      emitProgress()
      await vi.advanceTimersByTimeAsync(120_000)
      expect(sdk.cancel).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it("unloads a model that resolves after the watchdog", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      let finishLoad: (id: string) => void = () => {}
      stubLoadModelOnce(sdk, () => {
        const loading = new Promise<string>((resolve) => {
          finishLoad = resolve
        })
        return Object.assign(loading, { requestId: "late-load" })
      })
      const port = createQvacTranscription({
      })
      const pending = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const assertion = expect(pending).rejects.toMatchObject({
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(120_000)
      await assertion
      expect(sdk.transcribe).not.toHaveBeenCalled()
      expect(sdk.unloadModel).not.toHaveBeenCalled()

      finishLoad("late-model")
      await flushMicrotasks()
      expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "late-model" })
      expect(sdk.close).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the SDK busy until a timed-out load settles", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      stubLoadModelOnce(sdk, () => {
        const loading = new Promise<string>(() => {})
        return Object.assign(loading, { requestId: "still-loading" })
      })
      const port = createQvacTranscription()
      const first = port.transcribe({ filePath: "C:/tmp/capture.wav" })
      const firstAssertion = expect(first).rejects.toMatchObject({
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(120_000)
      await firstAssertion
      await expect(
        port.transcribe({ filePath: "C:/tmp/second.wav" }),
      ).rejects.toMatchObject({
        code: "TRANSCRIPTION_FAILED",
        message: "MODEL_LOAD_PENDING",
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the model resident when transcribe fails", async () => {
    const sdk = await import("./sdk")
    vi.mocked(sdk.transcribe).mockRejectedValueOnce(new Error("decode failed"))
    const port = createQvacTranscription({
    })

    await expect(
      port.transcribe({ filePath: "C:/tmp/capture.wav" }),
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
      message: "decode failed",
    })
    expect(sdk.unloadModel).not.toHaveBeenCalled()
    expect(sdk.close).not.toHaveBeenCalled()
  })

  it("rejects concurrent inference while loading", async () => {
    vi.useFakeTimers()
    try {
      const sdk = await import("./sdk")
      stubLoadModelOnce(sdk, () => new Promise<string>(() => {}))
      const port = createQvacTranscription({
        env: { OIRA_STT_LOAD_TIMEOUT_MS: "10000" },
      })
      const first = port.transcribe({ filePath: "C:/tmp/capture.wav" })

      await expect(
        port.transcribe({ filePath: "C:/tmp/second.wav" }),
      ).rejects.toMatchObject({
        code: "TRANSCRIPTION_FAILED",
        message: "INFERENCE_BUSY",
      })
      const firstAssertion = expect(first).rejects.toMatchObject({
        code: "TRANSCRIPTION_FAILED",
        message: "LOAD_WATCHDOG",
      })
      await vi.advanceTimersByTimeAsync(10_000)
      await firstAssertion
    } finally {
      vi.useRealTimers()
    }
  })
})
