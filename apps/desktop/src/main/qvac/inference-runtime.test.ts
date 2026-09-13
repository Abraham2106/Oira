import { beforeEach, describe, expect, it, vi } from "vitest"
import { createQvacInferenceRuntime } from "./inference-runtime"

vi.mock("./sdk", () => ({
  completion: vi.fn(() => ({
    requestId: "completion-1",
    final: Promise.resolve({
      contentText: "{}",
      raw: { fullText: "{}" },
      stopReason: "eos",
    }),
  })),
  cancel: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  loadModel: vi.fn(async () => "model-1"),
  transcribe: vi.fn(async () => [
    { id: "w1", text: "Hola.", startMs: 0, endMs: 800, append: false },
  ]),
  unloadModel: vi.fn(async () => undefined),
  getSystemResources: vi.fn(async () => ({
    capabilities: {
      gpus: {
        status: "supported",
        value: [
          { id: "nvidia-0", name: { status: "supported", value: "NVIDIA RTX 2050" }, vendor: { status: "supported", value: "NVIDIA" } },
          { id: "amd-1", name: { status: "supported", value: "AMD Radeon Graphics" }, vendor: { status: "supported", value: "AMD" } },
        ],
      },
    },
  })),
  ContextOverflowError: class ContextOverflowError extends Error {},
  QWEN3_4B_Q4_K_M: { name: "QWEN3_4B_Q4_K_M", expectedSize: 1 },
  WHISPER_LARGE_V3_TURBO: { name: "WHISPER_LARGE_V3_TURBO" },
}))

beforeEach(() => vi.clearAllMocks())

async function sdkModule() {
  return import("./sdk")
}

async function flushMicrotasks(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

describe("createQvacInferenceRuntime", () => {
  it("deduplicates concurrent warm calls", async () => {
    const sdk = await sdkModule()
    let finish: (id: string) => void = () => undefined
    vi.mocked(sdk.loadModel).mockImplementationOnce(() => {
      const loading = new Promise<string>((resolve) => {
        finish = resolve
      })
      return Object.assign(loading, { requestId: "warm-1" }) as never
    })
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const first = runtime.warmTranscription()
    const second = runtime.warmTranscription()
    await flushMicrotasks()
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    finish("model-1")
    await Promise.all([first, second])
    expect(runtime.getState()).toBe("READY")
  })

  it("reuses the loaded model and unloads only during shutdown", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    await runtime.warmTranscription()
    await runtime.transcribe({ filePath: "first.wav" })
    await runtime.transcribe({ filePath: "second.wav" })

    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(sdk.transcribe).toHaveBeenNthCalledWith(2, {
      modelId: "model-1",
      audioChunk: "second.wav",
      metadata: true,
    })
    expect(sdk.unloadModel).not.toHaveBeenCalled()

    await runtime.shutdown()
    await runtime.shutdown()
    expect(sdk.unloadModel).toHaveBeenCalledOnce()
    expect(sdk.close).toHaveBeenCalledOnce()
    expect(runtime.getState()).toBe("CLOSED")
  })

  it("releases Whisper before a later consultation warms it again", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    await runtime.warmTranscription()
    await runtime.handoffToStructuring()

    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "model-1" })
    expect(runtime.getState()).toBe("QWEN_READY")

    await runtime.warmTranscription()
    expect(sdk.loadModel).toHaveBeenCalledTimes(3)
  })

  it("does not load Qwen when Whisper unload fails", async () => {
    const sdk = await sdkModule()
    vi.mocked(sdk.unloadModel).mockRejectedValueOnce(new Error("unload failed"))
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    await runtime.warmTranscription()
    await expect(runtime.handoffToStructuring()).rejects.toThrow("unload failed")
    expect(sdk.loadModel).toHaveBeenCalledOnce()
    expect(runtime.getState()).toBe("FAILED")
  })

  it("requests Qwen immediately after Whisper unload without probing resources again", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })
    await runtime.warmTranscription()
    await runtime.transcribe({ filePath: "synthetic.wav" })
    expect(sdk.getSystemResources).toHaveBeenCalledOnce()

    let finishLoading!: (id: string) => void
    vi.mocked(sdk.loadModel).mockImplementationOnce(() => new Promise<string>((resolve) => {
      finishLoading = resolve
    }) as never)
    const handoff = runtime.handoffToStructuring()
    try {
      await flushMicrotasks(24)
      expect(sdk.getSystemResources).toHaveBeenCalledOnce()
      expect(sdk.loadModel).toHaveBeenCalledTimes(2)
      expect(sdk.loadModel).toHaveBeenLastCalledWith(expect.objectContaining({
        modelSrc: sdk.QWEN3_4B_Q4_K_M,
        modelConfig: expect.objectContaining({
          "main-gpu": 1,
        }),
      }))
      expect(runtime.getState()).toBe("QWEN_LOADING")
    } finally {
      finishLoading?.("qwen-1")
      await handoff
      await runtime.shutdown()
    }
  })

  it("uses json_schema responseFormat when schema is non-empty", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })
    await runtime.warmTranscription()
    await runtime.handoffToStructuring()
    const generation = runtime.beginGeneration()
    await runtime.completeStructuring({
      history: [{ role: "user", content: "consulta" }],
      schema: { type: "object", properties: {} },
      generation,
    })
    expect(sdk.completion).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "clinical_note",
            schema: { type: "object", properties: {} },
          },
        },
      }),
    )
    await runtime.shutdown()
  })

  it("uses json_object responseFormat when schema is empty", async () => {
    const sdk = await sdkModule()
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })
    await runtime.warmTranscription()
    await runtime.handoffToStructuring()
    const generation = runtime.beginGeneration()
    await runtime.completeStructuring({
      history: [{ role: "user", content: "consulta" }],
      schema: {},
      generation,
    })
    expect(sdk.completion).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: { type: "json_object" },
      }),
    )
    await runtime.shutdown()
  })

  it("discards a completion whose generation is stale", async () => {
    const sdk = await sdkModule()
    let finish: (value: { contentText: string; raw: { fullText: string } }) => void = () => undefined
    vi.mocked(sdk.completion).mockImplementationOnce(() => ({
      requestId: "stale-completion",
      final: new Promise((resolve) => { finish = resolve }),
    }))
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })
    await runtime.warmTranscription()
    await runtime.handoffToStructuring()
    const oldGeneration = runtime.beginGeneration()
    const pending = runtime.completeStructuring({
      history: [{ role: "user", content: "consulta" }],
      schema: {},
      generation: oldGeneration,
    })
    await flushMicrotasks()
    runtime.beginGeneration()
    finish({ contentText: "{}", raw: { fullText: "{}" } })
    await expect(pending).rejects.toMatchObject({ code: "OPERATION_CANCELLED" })
  })

  it("rejects concurrent transcriptions as INFERENCE_BUSY", async () => {
    const sdk = await sdkModule()
    let finish: (value: unknown[]) => void = () => undefined
    vi.mocked(sdk.transcribe).mockImplementationOnce(
      () => {
        const pending = new Promise<unknown[]>((resolve) => {
          finish = resolve
        })
        return pending as never
      },
    )
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const first = runtime.transcribe({ filePath: "first.wav" })
    await expect(runtime.transcribe({ filePath: "second.wav" })).rejects.toMatchObject({
      message: "INFERENCE_BUSY",
    })
    await flushMicrotasks()
    finish([])
    await first
  })

  it("cleans a model that resolves after shutdown before closing QVAC", async () => {
    const sdk = await sdkModule()
    let finish: (id: string) => void = () => undefined
    vi.mocked(sdk.loadModel).mockImplementationOnce(() => {
      const loading = new Promise<string>((resolve) => {
        finish = resolve
      })
      return Object.assign(loading, { requestId: "shutdown-load" }) as never
    })
    const runtime = createQvacInferenceRuntime({ loadSdk: async () => sdk })

    const warming = runtime.warmTranscription()
    await flushMicrotasks()
    const stopping = runtime.shutdown()
    expect(sdk.cancel).toHaveBeenCalledWith({ requestId: "shutdown-load" })
    finish("late-model")
    await expect(warming).rejects.toMatchObject({ code: "MODEL_NOT_READY" })
    await stopping

    expect(sdk.unloadModel).toHaveBeenCalledOnce()
    expect(sdk.unloadModel).toHaveBeenCalledWith({ modelId: "late-model" })
    expect(sdk.close).toHaveBeenCalledOnce()
    expect(runtime.getState()).toBe("CLOSED")
  })
})
