import { createQvacInferenceRuntime } from "./inference-runtime"
import { resolveGatewayModelPaths } from "./gateway-model-paths"
import { isAppError, toSerializableError } from "../errors/core"
import { transcriptionFailedError } from "../errors/inference"

const parentPort = process.parentPort
if (!parentPort) throw new Error("QVAC gateway requires Electron utilityProcess.parentPort")
if (process.versions.electron) process.env.ELECTRON_RUN_AS_NODE = "1"

const modelPaths = resolveGatewayModelPaths()
if (!modelPaths.whisper) {
  process.stderr.write("OIRA gateway: Whisper weights path was not passed to the inference process.\n")
}

const runtime = createQvacInferenceRuntime({
  modelPaths,
  onModelLifecycle: (event) => parentPort.postMessage({ type: "lifecycle", event }),
})

type Call = { id: string; type: "call"; method: string; args: unknown[] }
parentPort.on("message", ((event: globalThis.MessageEvent) => {
  const message = event.data as Call
  if (!message || message.type !== "call") return
  void (async () => {
    try {
      const method = runtime[message.method as keyof typeof runtime]
      if (typeof method !== "function") throw new Error(`Unknown QVAC gateway method: ${message.method}`)
      const result = await (method as (...args: unknown[]) => unknown)(...message.args)
      parentPort.postMessage({ id: message.id, type: "ok", result })
      if (message.method === "shutdown") process.exit(0)
    } catch (error) {
      const appError = isAppError(error) ? error : transcriptionFailedError(error instanceof Error ? error.message : "TRANSCRIPTION_FAILED")
      parentPort.postMessage({ id: message.id, type: "err", error: toSerializableError(appError) })
    }
  })()
}) as never)

parentPort.postMessage({ type: "ready" })
