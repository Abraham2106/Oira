import { appendFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { stringEnv } from "./gateway-model-paths"
import { createAppError } from "../errors/core"
import type { ModelLifecycleEvent } from "../../shared/types/model-lifecycle"
import type { SttSegmentInput } from "./qvac-transcript-mapper"
import { probeDiscreteVulkanIndex } from "./probe-vulkan-index"
import { resolveBundledMainScript } from "./bundled-main-script"
import { resolveQvacWorkerPath } from "./worker-path"
type StructuringCompletion = { text: string; thinkingText?: string; rawText?: string; stopReason?: "cancelled" | "eos" | "length" | "stopSequence"; stats?: unknown }
type QvacInferenceRuntime = {
  beginGeneration: () => number
  completeStructuring: (input: { history: Array<{ role: string; content: string }>; schema: Record<string, unknown>; generation: number }) => Promise<StructuringCompletion>
  completeQwen: (input: { role: "generator" | "reviewer"; prompt: string; schema?: unknown }) => Promise<string>
  warmTranscription: () => Promise<void>
  transcribe: (input: { filePath: string }) => Promise<SttSegmentInput[]>
  handoffToStructuring: () => Promise<void>
  releaseStructuring: () => Promise<void>
  getState: () => string
  shutdown: () => Promise<void>
}
type QvacInferenceRuntimeDeps = {
  onModelLifecycle?: (event: ModelLifecycleEvent) => void
  modelPaths?: { whisper?: string; qwen?: string }
}

type Child = {
  postMessage(message: unknown): void
  on(event: string, listener: (...args: unknown[]) => void): void
  once(event: string, listener: (...args: unknown[]) => void): void
  kill(): void
  stdout?: NodeJS.ReadableStream
  stderr?: NodeJS.ReadableStream
}
type Fork = (entry: string, args: string[], options: Record<string, unknown>) => Child

export type QvacGatewayClientDeps = QvacInferenceRuntimeDeps & {
  forkGateway?: Fork
  resolvePaths?: () => { userData?: string; resourcesPath?: string; appPath?: string }
  gatewayEntry?: string
  probeEntry?: string
  probeVulkanIndex?: (env: NodeJS.ProcessEnv) => Promise<number | undefined>
  readyTimeoutMs?: number
}

export function createQvacGatewayClient(deps: QvacGatewayClientDeps = {}): QvacInferenceRuntime {
  let child: Child | undefined
  let boot: Promise<void> | undefined
  let sequence = 0
  let generation = 0
  let generationReady: Promise<unknown> = Promise.resolve()
  const state = "IDLE"
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>()
  const lifecycle = deps.onModelLifecycle

  const start = (): Promise<void> => {
    if (boot) return boot
    boot = (async () => {
      const paths = deps.resolvePaths?.() ?? await (async () => {
        const electron = await import("electron")
        return {
          userData: electron.app?.getPath("userData"),
          resourcesPath: process.resourcesPath,
          appPath: electron.app?.getAppPath(),
        }
      })()
      const entry = deps.gatewayEntry ?? resolveBundledMainScript("gateway.js")
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...(deps.modelPaths?.whisper ? { OIRA_WHISPER_MODEL_PATH: deps.modelPaths.whisper } : {}),
        ...(deps.modelPaths?.qwen ? { OIRA_QWEN_MODEL_PATH: deps.modelPaths.qwen } : {}),
      }
      delete env.ELECTRON_RUN_AS_NODE
      const worker = resolveQvacWorkerPath({ ...paths, existingEnv: env })
      if (worker) env.QVAC_WORKER_PATH = worker
      if (!env.GGML_VK_VISIBLE_DEVICES) {
        const vulkanIndex = await (deps.probeVulkanIndex ?? ((probeEnv) => probeDiscreteVulkanIndex({
          execPath: process.execPath,
          probeEntry: deps.probeEntry ?? resolveBundledMainScript("gpu-probe.js"),
          env: probeEnv,
        })))(env)
        if (typeof vulkanIndex === "number") env.GGML_VK_VISIBLE_DEVICES = String(vulkanIndex)
      }
      const userData = paths.userData ?? process.cwd()
      const modelCacheDir = deps.modelPaths?.whisper
        ? dirname(deps.modelPaths.whisper)
        : join(userData, "model-cache")
      const runtimeConfig = join(userData, "qvac.config.json")
      try {
        writeFileSync(runtimeConfig, `${JSON.stringify({ cacheDirectory: modelCacheDir }, null, 2)}\n`)
        env.QVAC_CONFIG_PATH = runtimeConfig
      } catch {
        /* File-path modelSrc still loads without this config. */
      }
      const modelArg = JSON.stringify({
        ...(deps.modelPaths?.whisper ? { whisper: deps.modelPaths.whisper } : {}),
        ...(deps.modelPaths?.qwen ? { qwen: deps.modelPaths.qwen } : {}),
      })
      const fork = deps.forkGateway ?? ((await import("electron")).utilityProcess.fork as unknown as Fork)
      child = fork(entry, modelArg === "{}" ? [] : [modelArg], {
        env: stringEnv(env),
        cwd: userData,
        serviceName: "oira-qvac",
        stdio: ["ignore", "pipe", "pipe"],
      })
      const logPath = join(paths.userData ?? tmpdir(), "qvac-gateway.log")
      for (const stream of [child.stdout, child.stderr]) stream?.on("data", (data: Buffer) => {
        try { appendFileSync(logPath, data) } catch { /* diagnostics are best effort */ }
      })
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("QVAC_GATEWAY_READY_TIMEOUT")), deps.readyTimeoutMs ?? 15_000)
        child?.on("message", (raw: unknown) => {
          const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : undefined
          const message = (
            record && typeof record.type === "string"
              ? record
              : record?.data && typeof record.data === "object"
                ? record.data as Record<string, unknown>
                : undefined
          ) as { type?: string; id?: string; event?: ModelLifecycleEvent; result?: unknown; error?: { code?: string; message?: string; hint?: string; retryable?: boolean } } | undefined
          if (message?.type === "ready") { clearTimeout(timeout); resolve() }
          else if (message?.type === "lifecycle") lifecycle?.(message.event as ModelLifecycleEvent)
          else if (message?.id) {
            const request = pending.get(message.id)
            if (!request) return
            pending.delete(message.id)
            if (message.type === "ok") request.resolve(message.result)
            else {
              const error = message.error
              request.reject(createAppError((error?.code ?? "TRANSCRIPTION_FAILED") as never, error?.message ?? "TRANSCRIPTION_FAILED", { hint: error?.hint, retryable: error?.retryable }))
            }
          }
        })
        child?.once("exit", () => {
          if (child) child = undefined
          boot = undefined
          reject(new Error("QVAC_GATEWAY_EXITED"))
        })
      })
    })().catch((error) => {
      boot = undefined
      child = undefined
      throw createAppError(
        "TRANSCRIPTION_FAILED",
        error instanceof Error ? error.message : "QVAC_GATEWAY_FAILED",
        { retryable: true, hint: "No se pudo arrancar el proceso de inferencia local.", cause: error },
      )
    })
    return boot
  }

  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    await start()
    const id = `${++sequence}`
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      child?.postMessage({ id, type: "call", method, args })
    })
  }
  const shutdown = async (): Promise<void> => {
    if (!child) return
    const current = child
    try { await call("shutdown") } catch { /* exit backstop below */ }
    await new Promise<void>((resolve) => {
      let done = false
      const finish = () => { if (!done) { done = true; resolve() } }
      current.once("exit", finish)
      setTimeout(() => { current.kill(); finish() }, 5_000)
      setTimeout(() => { current.kill(); finish() }, 6_000)
    })
    child = undefined
    boot = undefined
  }
  return {
    beginGeneration: () => {
      generation += 1
      generationReady = call<number>("beginGeneration")
      return generation
    },
    completeStructuring: async (input) => {
      await generationReady
      return call<StructuringCompletion>("completeStructuring", input)
    },
    completeQwen: (input) => call<string>("completeQwen", input),
    warmTranscription: () => call<void>("warmTranscription"),
    transcribe: (input) => call<SttSegmentInput[]>("transcribe", input),
    handoffToStructuring: () => call<void>("handoffToStructuring"),
    releaseStructuring: () => call<void>("releaseStructuring"),
    getState: () => state,
    shutdown,
  }
}
