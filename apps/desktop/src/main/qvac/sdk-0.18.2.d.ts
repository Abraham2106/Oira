/**
 * QVAC 0.18.2 ships its declarations through conditional exports that the
 * desktop project's `moduleResolution: bundler` does not currently resolve.
 * This surface matches the installed package APIs that Oira actually calls.
 * Runtime imports still target `@qvac/sdk` 0.18.2.
 */
declare module "@qvac/sdk" {
  export const WHISPER_LARGE_V3_TURBO: {
    name: string
    expectedSize: number
    engine: "whispercpp-transcription"
  }

  export const QWEN3_4B_Q4_K_M: {
    name: string
    expectedSize: number
    engine: "llamacpp-completion"
    quantization: string
    params: string
  }

  export type WhisperSttModelConfig = {
    language?: string
    translate?: boolean
    temperature?: number
    suppress_blank?: boolean
    suppress_nst?: boolean
    no_context?: boolean
    no_timestamps?: boolean
    strategy?: "beam_search" | "greedy"
    beam_search_beam_size?: number
    contextParams?: {
      use_gpu?: boolean
      gpu_device?: number
    }
  }

  export type LlmModelConfig = {
    ctx_size?: number
    temp?: number
    top_p?: number
    top_k?: number
    seed?: number
    gpu_layers?: number
    device?: string
    predict?: -1 | -2 | number
    system_prompt?: string
    reasoning_budget?: number
    "main-gpu"?: number | "integrated" | "dedicated"
    "split-mode"?: "none" | "layer" | "row"
  }

  export type ModelProgressUpdate = {
    percentage?: unknown
  }

  export function loadModel(input: {
    modelType?: "whispercpp-transcription" | "llamacpp-completion"
    modelSrc: typeof WHISPER_LARGE_V3_TURBO | typeof QWEN3_4B_Q4_K_M | string
    modelConfig?: WhisperSttModelConfig | LlmModelConfig
    onProgress?: (progress: ModelProgressUpdate) => void
  }): Promise<string> & { requestId?: string }

  export function transcribe(input: {
    modelId: string
    audioChunk: string
    metadata?: boolean
  }): Promise<unknown>

  export type CompletionStats = {
    timeToFirstToken?: number
    tokensPerSecond?: number
    cacheTokens?: number
    promptTokens?: number
    generatedTokens?: number
    emittedTokens?: number
    backendDevice?: "gpu" | "cpu"
  }

  export type CompletionFinal = {
    contentText: string
    thinkingText?: string
    stats?: CompletionStats
    stopReason?: "cancelled" | "eos" | "length" | "stopSequence"
    raw: { fullText: string }
  }

  export type CompletionRun = {
    requestId: string
    final: Promise<CompletionFinal>
  }

  export type CompletionResponseFormat =
    | { type: "text" }
    | { type: "json_object" }
    | {
        type: "json_schema"
        json_schema: {
          name: string
          description?: string
          schema: Record<string, unknown>
          strict?: boolean
        }
      }

  export function completion(input: {
    modelId: string
    history: Array<{ role: string; content: string }>
    stream: boolean
    captureThinking?: boolean
    generationParams?: {
      temp?: number
      top_p?: number
      top_k?: number
      predict?: number
      seed?: number
      reasoning_budget?: number
    }
    responseFormat?: CompletionResponseFormat
  }): CompletionRun

  export function unloadModel(input: {
    modelId: string
    clearStorage?: boolean
    autoClose?: boolean
  }): Promise<void>

  export function cancel(input: {
    requestId?: string
    modelId?: string
    kind?: "completion"
  }): Promise<void>

  export type ResourceMetric<T> =
    | {
        status: "supported"
        value: T
        provenance?: { source?: string }
      }
    | {
        status: "unavailable" | "unverified" | "failed"
        reason?: string
      }

  export type GpuResourceCapabilities = {
    id: string
    name?: ResourceMetric<string>
    vendor?: ResourceMetric<string>
    vram?: ResourceMetric<number> | number
    vramBytes?: ResourceMetric<number> | number
    memoryTotalBytes?: ResourceMetric<number>
    memory?: {
      total?: ResourceMetric<number> | number
      used?: ResourceMetric<number> | number
    }
    drivers?: {
      cuda?: ResourceMetric<boolean> | boolean
      vulkan?: ResourceMetric<boolean> | boolean
    }
  }

  export type SystemResources = {
    capabilities?: {
      gpus?: ResourceMetric<GpuResourceCapabilities[]>
    }
    sample?: {
      gpus?: ResourceMetric<GpuResourceCapabilities[]>
    }
  }

  export function getSystemResources(input?: {
    sample?: boolean
  }): Promise<SystemResources>

  export function close(): Promise<void>

  export class ContextOverflowError extends Error {}
}
