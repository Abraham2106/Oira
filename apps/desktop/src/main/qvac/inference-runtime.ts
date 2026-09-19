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
import { pinGgmlVulkanDevice } from "./pin-ggml-vulkan"
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
  modelPaths?: { whisper?: string; qwen?: string }
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
  /**
   * Completion unificada para Qwen (generador | revisor).
   * role: "generator" | "reviewer"
   * prompt: prompt completo listo para enviar
   * schema: opcional, zod schema para validación de salida estructurada
   */
  completeQwen: (input: { role: "generator" | "reviewer"; prompt: string; schema?: unknown }) => Promise<string>
  warmTranscription: () => Promise<void>
  transcribe: (input: { filePath: string }) => Promise<SttSegmentInput[]>
  handoffToStructuring: () => Promise<void>
  releaseStructuring: () => Promise<void>
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
  let releasePromise: Promise<void> | undefined
  let shutdownPromise: Promise<void> | undefined
  let pendingLoadRequestId: string | undefined
  let loadSettlement: Promise<void> | undefined
  let lateLoadPending: Promise<void> | undefined
  let settledLateId: string | undefined
  let completionRequestId: string | undefined
  let completionPromise: Promise<StructuringCompletion | string> | undefined
  // Serialize Qwen completions: the SDK slot (request id + promise) is
  // single-occupancy, so concurrent completeStructuring/completeQwen calls
  // must queue instead of clobbering each other's cancellation handles.
  let completionChain: Promise<unknown> = Promise.resolve()
  let activeTranscription = false
  let generation = 0
  let gpu: { id: string; name: string; index?: number; vulkanIndex?: number; llmMainGpu: number | "dedicated" | "integrated"; vendor?: string; label?: string } | undefined

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
      resources = await current.getSystemResources({ sample: true })
    } catch {
      return gpu
    }
    const list = extractGpusFromSystemResources(resources)
    const chosen = selectPreferredGpu(list)
    if (!chosen) return gpu
    const physical = chosen.whisperGpuDevice
    const whisperIndex = typeof physical === "number" ? pinGgmlVulkanDevice(physical) : undefined
    return (gpu = {
      ...chosen.identity,
      ...(whisperIndex === undefined ? {} : { index: whisperIndex }),
      ...(physical === undefined ? {} : { vulkanIndex: physical }),
      llmMainGpu: chosen.llmMainGpu,
      label: chosen.requestedLabel,
    })
  }
  const requestedDevice = (): string => gpu?.label ?? gpu?.name ?? "GPU no identificada"
  const selectedMainGpu = (): number | "dedicated" | "integrated" => gpu?.llmMainGpu ?? "dedicated"
  const qwenDeviceInfo = () => ({
    requested: requestedDevice(),
    acceleration: qwenAccelerationLabel(selectedMainGpu()),
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
    const loading = current.loadModel({
      modelType: kind === "whisper" ? "whispercpp-transcription" : "llamacpp-completion",
      modelSrc: kind === "whisper"
        ? deps.modelPaths?.whisper ?? modelSrc
        : deps.modelPaths?.qwen ?? modelSrc,
      modelConfig: config,
      onProgress: () => bump(),
    }) as LoadModelHandle
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
        acceleration: `use_gpu=true${typeof selected?.index === "number" ? `; gpu_device=${selected.index}` : ""}${typeof selected?.vulkanIndex === "number" ? `; GGML_VK_VISIBLE_DEVICES=${selected.vulkanIndex}` : ""}`,
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
    if (!gpu) await resolveGpu(current)
    state = "QWEN_LOADING"
    report({
      model: "qwen",
      state: "LOADING",
      device: {
        ...qwenDeviceInfo(),
      },
    })
    const id = await load("qwen", current.QWEN3_4B_Q4_K_M, createQwenLlmConfig({
      mainGpu: selectedMainGpu(),
    }))
    // A shutdown may have landed while Qwen was loading: never install a
    // resident model on a closing runtime (use-after-close).
    if (closing()) {
      await current.unloadModel({ modelId: id }).catch(() => undefined)
      throw notReady()
    }
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
      if (releasePromise) await releasePromise.catch(() => undefined)
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
      try {
        if (releasePromise) await releasePromise.catch(() => undefined)
        if (state === "QWEN_READY" || state === "STRUCTURING") return
        state = "HANDING_OFF"
        if (resident === "whisper" && residentId) await unload("whisper", residentId)
        await loadQwen()
      } catch (error) {
        // A failed Qwen load must not wedge the runtime in HANDING_OFF
        // forever. unload() already maps its own failures to FAILED, so only
        // reset the untouched handoff marker here.
        if (state === "HANDING_OFF") state = "IDLE"
        throw error
      }
    })()
    handoffPromise = run
    void run.then(
      () => { if (handoffPromise === run) handoffPromise = undefined },
      () => { if (handoffPromise === run) handoffPromise = undefined },
    )
    return run
  }

  const releaseStructuring = (): Promise<void> => {
    if (closing()) return Promise.resolve()
    if (releasePromise) return releasePromise
    const run = (async () => {
      if (handoffPromise) await handoffPromise.catch(() => undefined)
      if (completionPromise) await completionPromise.catch(() => undefined)
      if (resident !== "qwen" || !residentId) return
      await unload("qwen", residentId)
      if (!closing()) state = "IDLE"
    })()
    releasePromise = run
    void run.then(
      () => { if (releasePromise === run) releasePromise = undefined },
      () => { if (releasePromise === run) releasePromise = undefined },
    )
    return run
  }

  const beginGeneration = (): number => {
    generation++
    return generation
  }

  const serializeCompletion = <T>(task: () => Promise<T>): Promise<T> => {
    const run = completionChain.catch(() => undefined).then(task)
    completionChain = run.catch(() => undefined)
    return run
  }

  const completeStructuringInner = async (input: {
    history: Array<{ role: string; content: string }>
    schema: Record<string, unknown>
    generation: number
  }): Promise<StructuringCompletion> => {
    await handoffToStructuring()
    if (closing()) throw notReady()
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

  const completeQwenInner = async (input: { role: "generator" | "reviewer"; prompt: string; schema?: unknown }): Promise<string> => {
    await handoffToStructuring()
    if (closing()) throw notReady()
    if (!sdk || !residentId || resident !== "qwen") throw notReady()
    state = "STRUCTURING"
    report({
      model: "qwen",
      state: "STRUCTURING",
      device: qwenDeviceInfo(),
    })
    const run = sdk.completion({
      modelId: residentId,
      history: [{ role: "user", content: input.prompt }],
      stream: false,
      captureThinking: false,
      generationParams: createQwenGenerationParams(),
      responseFormat:
        input.schema && typeof input.schema === "object" && Object.keys(input.schema as Record<string, unknown>).length > 0
          ? {
              type: "json_schema",
              json_schema: {
                name: `review_${input.role}`,
                schema: input.schema as Record<string, unknown>,
              },
            }
          : { type: "json_object" },
    })
    completionRequestId = run.requestId
    const pending = run.final.then((final) => {
      report({
        model: "qwen",
        state: "READY",
        device: {
          ...qwenDeviceInfo(),
          ...(final.stats?.backendDevice ? { effective: final.stats.backendDevice } : {}),
        },
      })
      return final.contentText
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

  const completeStructuring = (
    input: Parameters<typeof completeStructuringInner>[0],
  ): Promise<StructuringCompletion> => serializeCompletion(() => completeStructuringInner(input))

  const completeQwen = (
    input: Parameters<typeof completeQwenInner>[0],
  ): Promise<string> => serializeCompletion(() => completeQwenInner(input))

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
      await completionChain.catch(() => undefined)
      if (loadSettlement) await loadSettlement
      if (lateLoadPending) await lateLoadPending
      if (warmPromise) await warmPromise.catch(() => undefined)
      if (handoffPromise) await handoffPromise.catch(() => undefined)
      if (releasePromise) await releasePromise.catch(() => undefined)
      if (sdk && residentId && resident) await unload(resident, residentId).catch(() => undefined)
      if (sdk) await sdk.close().catch(() => undefined)
      state = "CLOSED"
    })()
    return shutdownPromise
  }

  return { beginGeneration, completeStructuring, completeQwen, warmTranscription, transcribe, handoffToStructuring, releaseStructuring, getState: () => activeTranscription ? "TRANSCRIBING" : state, shutdown }
}
