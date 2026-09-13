import { isAppError } from "../errors/core"
import { createAppError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"
import { resolveTranscriptionProfile } from "../inference/transcription-profile"
import { P0_LLM_MODEL_ID, P0_STT_MODEL_ID } from "./model-ids"
import type { SttSegmentInput } from "./qvac-transcript-mapper"
import { createQwenGenerationParams, createQwenLlmConfig, qwenAccelerationLabel } from "./qwen-llm-config"
import { createWhisperSttConfig } from "./whisper-stt-config"
import type { CompletionStats } from "./sdk"
import { extractGpusFromSystemResources, selectPreferredGpu } from "./device-selection"
import type { ModelLifecycleEvent } from "../../shared/types/model-lifecycle"

export type QvacSdkModule = typeof import("./sdk")
type LoadModelHandle = Promise<string> & { requestId?: string }
type Resident = "whisper" | "qwen"

export type QvacInferenceRuntimeState =
  | "IDLE" | "WARMING" | "READY" | "TRANSCRIBING" | "HANDING_OFF"
  | "QWEN_LOADING" | "QWEN_READY" | "STRUCTURING" | "FAILED" | "CLOSING" | "CLOSED"

export type QvacInferenceRuntimeDeps = {
  env?: { OIRA_STT_LOAD_TIMEOUT_MS?: string }
  loadSdk?: () => Promise<QvacSdkModule>
  onModelLifecycle?: (event: ModelLifecycleEvent) => void
}

export type StructuringCompletion = {
  text: string
  thinkingText?: string
  rawText?: string
  stopReason?: "cancelled" | "eos" | "length" | "stopSequence"
  stats?: CompletionStats
}

export type QvacInferenceRuntime = {
  beginGeneration: () => number
  completeStructuring: (input: {
    history: Array<{ role: string; content: string }>
    schema: Record<string, unknown>
    generation: number
  }) => Promise<StructuringCompletion>
  warmTranscription: () => Promise<void>
  transcribe: (input: { filePath: string }) => Promise<SttSegmentInput[]>
  handoffToStructuring: () => Promise<void>
  getState: () => QvacInferenceRuntimeState
  shutdown: () => Promise<void>
}

const cancelled = () => createAppError("OPERATION_CANCELLED", "La operación fue cancelada.", { retryable: true })
const notReady = () => createAppError("MODEL_NOT_READY", "El modelo local no está listo.", { retryable: true })

export function createQvacInferenceRuntime(deps: QvacInferenceRuntimeDeps = {}): QvacInferenceRuntime {
  let sdk: QvacSdkModule | undefined
  let state: QvacInferenceRuntimeState = "IDLE"
  let resident: Resident | undefined
  let residentId: string | undefined
  let warmPromise: Promise<void> | undefined
  let handoffPromise: Promise<void> | undefined
  let shutdownPromise: Promise<void> | undefined
  let pendingLoadRequestId: string | undefined
  let loadSettlement: Promise<void> | undefined
  let lateLoadPending: Promise<void> | undefined
  let settledLateId: string | undefined
  let completionRequestId: string | undefined
  let completionPromise: Promise<StructuringCompletion> | undefined
  let activeTranscription = false
  let generation = 0
  let gpu: { id: string; name: string; index: number; llmMainGpu: number; vendor?: string; label?: string } | undefined

  const getSdk = async (): Promise<QvacSdkModule> =>
    (sdk ??= await (deps.loadSdk ?? (() => import("./sdk")))())
  const report = (event: ModelLifecycleEvent): void => deps.onModelLifecycle?.(event)
  const closing = (): boolean => state === "CLOSING" || state === "CLOSED"
  const safeError = (error: unknown) =>
    isAppError(error)
      ? error
      : transcriptionFailedError(error instanceof Error ? error.message : "TRANSCRIPTION_FAILED")
  const resolveGpu = async (current: QvacSdkModule): Promise<typeof gpu> => {
    let resources: Awaited<ReturnType<QvacSdkModule["getSystemResources"]>> | undefined
    try {
      resources = await current.getSystemResources({ includeSamples: true })
    } catch {
      return gpu
    }
    const list = extractGpusFromSystemResources(resources)
    const chosen = selectPreferredGpu(list)
    return (gpu = chosen
      ? {
          ...chosen.identity,
          index: chosen.whisperGpuDevice,
          llmMainGpu: chosen.llmMainGpu,
          label: chosen.requestedLabel,
        }
      : gpu)
  }
  const requestedDevice = (): string => gpu?.label ?? gpu?.name ?? "GPU no identificada"
  const selectedGpuIndex = (): number | undefined => gpu?.llmMainGpu
  const qwenDeviceInfo = () => ({
    requested: requestedDevice(),
    acceleration: qwenAccelerationLabel(selectedGpuIndex() ?? 0),
  })
  const cleanupLate = async (current: QvacSdkModule, id?: string): Promise<void> => {
    pendingLoadRequestId = undefined
    if (!id) return
    if (settledLateId === id) settledLateId = undefined
    await current.unloadModel({ modelId: id }).catch(() => undefined)
  }

  async function load(
    kind: Resident,
    modelSrc: QvacSdkModule["WHISPER_LARGE_V3_TURBO"] | QvacSdkModule["QWEN3_4B_Q4_K_M"],
    config: Parameters<QvacSdkModule["loadModel"]>[0]["modelConfig"],
  ): Promise<string> {
    const current = await getSdk()
    const profile = resolveTranscriptionProfile({
      requestedTimeoutMs: deps.env?.OIRA_STT_LOAD_TIMEOUT_MS ?? process.env.OIRA_STT_LOAD_TIMEOUT_MS,
      language: "es",
    })
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let watchdog = false
    let settled = false
    let loaded = false
    let bump = (): void => undefined
    const loading = current.loadModel({ modelSrc, modelConfig: config, onProgress: () => bump() }) as LoadModelHandle
    pendingLoadRequestId = loading.requestId
    loadSettlement = loading.then(
      (id) => { settledLateId = id },
      () => undefined,
    ).then(() => { pendingLoadRequestId = undefined })
    const result = new Promise<string>((resolve, reject) => {
      const finish = (callback: () => void): void => {
        if (settled) return
        settled = true
        if (idleTimer) clearTimeout(idleTimer)
        callback()
      }
      bump = (): void => {
        if (settled) return
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          watchdog = true
          if (loading.requestId) void current.cancel({ requestId: loading.requestId }).catch(() => undefined)
          finish(() => reject(transcriptionFailedError("LOAD_WATCHDOG")))
        }, profile.loadIdleTimeoutMs)
      }
      loading.then(
        (id) => watchdog ? void (lateLoadPending = cleanupLate(current, id).finally(() => { lateLoadPending = undefined })) : finish(() => resolve(id)),
        (error) => { if (!watchdog) finish(() => reject(error)) },
      )
      bump()
    })
    try {
      const id = await result
      loadSettlement = undefined
      loaded = true
      return id
    } catch (error) {
      throw safeError(error)
    } finally {
      if (kind === "qwen" && !loaded) report({ model: "qwen", state: "FAILED", device: { requested: requestedDevice() } })
    }
  }

  const unload = async (kind: Resident, id: string): Promise<void> => {
    const current = await getSdk()
    report({ model: kind, state: "UNLOADING" })
    try {
      await current.unloadModel({ modelId: id })
      report({ model: kind, state: "UNLOADED" })
      if (residentId === id) { resident = undefined; residentId = undefined }
    } catch (error) {
      state = "FAILED"
      report({ model: kind, state: "FAILED" })
      throw error
    }
  }

  const loadWhisper = async (): Promise<void> => {
    const current = await getSdk()
    if (current.WHISPER_LARGE_V3_TURBO.name !== P0_STT_MODEL_ID) throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
    const selected = await resolveGpu(current)
    const id = await load("whisper", current.WHISPER_LARGE_V3_TURBO, createWhisperSttConfig(resolveTranscriptionProfile({
      requestedTimeoutMs: deps.env?.OIRA_STT_LOAD_TIMEOUT_MS ?? process.env.OIRA_STT_LOAD_TIMEOUT_MS, language: "es",
    }), { gpuDevice: selected?.index }))
    resident = "whisper"; residentId = id
    report({
      model: "whisper",
      state: "READY",
      device: {
        requested: requestedDevice(),
        acceleration: `use_gpu=true${typeof selected?.index === "number" ? `; gpu_device=${selected.index}` : ""}`,
        ...(selected ? {} : { fallbackReason: "No se detectó una GPU." }),
      },
    })
  }
  const loadQwen = async (): Promise<void> => {
    const current = await getSdk()
    if (current.QWEN3_4B_Q4_K_M.name !== P0_LLM_MODEL_ID) throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
    // Whisper already discovered the device for this consultation. On Windows,
    // another SDK resource probe can take seconds and delay the actual Qwen
    // load until after the renderer's transcript reveal has finished.
    // Device metadata is optional; it must never gate this handoff.
    const selected = gpu
    const mainGpu = selectedGpuIndex()
    state = "QWEN_LOADING"
    report({
      model: "qwen",
      state: "LOADING",
      device: {
        ...qwenDeviceInfo(),
        ...(selected ? {} : { fallbackReason: "No se detectó una GPU; llama.cpp elige el dispositivo por defecto." }),
      },
    })
    const id = await load("qwen", current.QWEN3_4B_Q4_K_M, createQwenLlmConfig(
      mainGpu === undefined ? {} : { mainGpu },
    ))
    resident = "qwen"; residentId = id
    state = "QWEN_READY"
    report({
      model: "qwen",
      state: "READY",
      device: qwenDeviceInfo(),
    })
  }

  const warmTranscription = (): Promise<void> => {
    if (state === "READY" || state === "TRANSCRIBING") return Promise.resolve()
    if (closing()) return Promise.reject(notReady())
    if (warmPromise) return warmPromise
    if (loadSettlement || pendingLoadRequestId || lateLoadPending) {
      return Promise.reject(transcriptionFailedError("MODEL_LOAD_PENDING"))
    }
    const run = (async () => {
      if (handoffPromise) await handoffPromise
      if (state === "STRUCTURING") {
        generation++
        if (completionRequestId && sdk) await sdk.cancel({ requestId: completionRequestId }).catch(() => undefined)
        if (completionPromise) await completionPromise.catch(() => undefined)
      }
      if (resident === "qwen" && residentId) await unload("qwen", residentId)
      if (!loadSettlement && !lateLoadPending) {
        state = "WARMING"; report({ model: "whisper", state: "LOADING" })
        await loadWhisper()
        if (closing()) {
          if (resident === "whisper" && residentId) await unload("whisper", residentId)
          throw notReady()
        }
        state = "READY"
      }
    })()
    warmPromise = run
    void run.then(
      () => { if (warmPromise === run) warmPromise = undefined },
      () => { if (warmPromise === run) warmPromise = undefined },
    )
    return run
  }

  const handoffToStructuring = (): Promise<void> => {
    if (handoffPromise) return handoffPromise
    if (closing()) return Promise.resolve()
    const run = (async () => {
      if (state === "QWEN_READY" || state === "STRUCTURING") return
      state = "HANDING_OFF"
      if (resident === "whisper" && residentId) await unload("whisper", residentId)
      await loadQwen()
    })()
    handoffPromise = run
    void run.then(
      () => { if (handoffPromise === run) handoffPromise = undefined },
      () => { if (handoffPromise === run) handoffPromise = undefined },
    )
    return run
  }

  const beginGeneration = (): number => {
    generation++
    return generation
  }

  const completeStructuring = async (input: {
    history: Array<{ role: string; content: string }>
    schema: Record<string, unknown>
    generation: number
  }): Promise<StructuringCompletion> => {
    await handoffToStructuring()
    if (input.generation !== generation) throw cancelled()
    if (!sdk || !residentId || resident !== "qwen") throw notReady()
    state = "STRUCTURING"
    report({
      model: "qwen",
      state: "STRUCTURING",
      device: qwenDeviceInfo(),
    })
    const run = sdk.completion({
      modelId: residentId,
      history: input.history,
      stream: true,
      captureThinking: true,
      generationParams: createQwenGenerationParams(),
      responseFormat:
        Object.keys(input.schema).length > 0
          ? {
              type: "json_schema",
              json_schema: {
                name: "clinical_note",
                schema: input.schema,
              },
            }
          : { type: "json_object" },
    })
    completionRequestId = run.requestId
    const pending = run.final.then((final) => {
      if (input.generation !== generation) throw cancelled()
      report({
        model: "qwen",
        state: "READY",
        device: {
          ...qwenDeviceInfo(),
          ...(final.stats?.backendDevice ? { effective: final.stats.backendDevice } : {}),
        },
      })
      return {
        text: final.contentText,
        thinkingText: final.thinkingText,
        rawText: final.raw.fullText,
        stopReason: final.stopReason,
        stats: final.stats,
      }
    })
    completionPromise = pending
    try {
      const output = await pending
      return output
    } finally {
      completionPromise = undefined
      completionRequestId = undefined
      if (!closing() && state === "STRUCTURING") state = "QWEN_READY"
    }
  }

  const transcribe = async (input: { filePath: string }): Promise<SttSegmentInput[]> => {
    if (activeTranscription) throw transcriptionFailedError("INFERENCE_BUSY")
    activeTranscription = true
    try {
      await warmTranscription()
      if (!sdk || !residentId || resident !== "whisper") throw notReady()
      state = "TRANSCRIBING"
      return (await sdk.transcribe({ modelId: residentId, audioChunk: input.filePath, metadata: true })) as SttSegmentInput[]
    } catch (error) {
      throw safeError(error)
    } finally {
      activeTranscription = false
      if (state === "TRANSCRIBING") state = "READY"
    }
  }

  const shutdown = (): Promise<void> => {
    if (shutdownPromise) return shutdownPromise
    shutdownPromise = (async () => {
      generation++
      state = "CLOSING"
      if (completionRequestId && sdk) await sdk.cancel({ requestId: completionRequestId, kind: "completion" }).catch(() => undefined)
      if (pendingLoadRequestId && sdk) await sdk.cancel({ requestId: pendingLoadRequestId }).catch(() => undefined)
      if (completionPromise) await completionPromise.catch(() => undefined)
      if (loadSettlement) await loadSettlement
      if (lateLoadPending) await lateLoadPending
      if (warmPromise) await warmPromise.catch(() => undefined)
      if (handoffPromise) await handoffPromise.catch(() => undefined)
      if (sdk && residentId && resident) await unload(resident, residentId).catch(() => undefined)
      if (sdk) await sdk.close().catch(() => undefined)
      state = "CLOSED"
    })()
    return shutdownPromise
  }

  return { beginGeneration, completeStructuring, warmTranscription, transcribe, handoffToStructuring, getState: () => activeTranscription ? "TRANSCRIBING" : state, shutdown }
}
