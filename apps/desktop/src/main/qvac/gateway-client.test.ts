import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createQvacGatewayClient } from "./gateway-client"

const temporaryDirectories: string[] = []

afterEach(async () => {
  delete process.env.GGML_VK_VISIBLE_DEVICES
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function userDataDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "oira-gateway-"))
  temporaryDirectories.push(directory)
  return directory
}

function readyChild() {
  let onMessage: ((raw: unknown) => void) | undefined
  let onExit: (() => void) | undefined
  return {
    postMessage(message: unknown): void {
      const msg = message as { id?: string; method?: string }
      if (!msg.id) return
      queueMicrotask(() => {
        onMessage?.({ id: msg.id, type: "ok", result: undefined })
        if (msg.method === "shutdown") setTimeout(() => onExit?.(), 0)
      })
    },
    on(event: string, listener: (...args: unknown[]) => void): void {
      if (event === "message") {
        onMessage = listener
        queueMicrotask(() => listener({ type: "ready" }))
      }
    },
    once(event: string, listener: (...args: unknown[]) => void): void {
      if (event === "exit") onExit = () => listener()
    },
    kill(): void { onExit?.() },
  }
}

describe("createQvacGatewayClient", () => {
  it("pins GGML_VK_VISIBLE_DEVICES before forking the gateway", async () => {
    const userData = await userDataDir()
    let forkedEnv: NodeJS.ProcessEnv | undefined
    const client = createQvacGatewayClient({
      resolvePaths: () => ({ userData, resourcesPath: userData, appPath: userData }),
      gatewayEntry: "gateway.js",
      probeVulkanIndex: async () => 1,
      forkGateway: (_entry, _args, options) => {
        forkedEnv = options.env as NodeJS.ProcessEnv
        return readyChild()
      },
    })
    await client.warmTranscription()
    expect(forkedEnv?.GGML_VK_VISIBLE_DEVICES).toBe("1")
    expect(forkedEnv?.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(forkedEnv?.QVAC_CONFIG_PATH).toBeDefined()
    await client.shutdown()
  })

  it("passes verified model files to the gateway via env and argv", async () => {
    const userData = await userDataDir()
    let args: string[] | undefined
    let forkedEnv: NodeJS.ProcessEnv | undefined
    const client = createQvacGatewayClient({
      modelPaths: { whisper: "C:/models/whisper.bin", qwen: "C:/models/qwen.gguf" },
      resolvePaths: () => ({ userData, resourcesPath: userData, appPath: userData }),
      gatewayEntry: "gateway.js",
      probeVulkanIndex: async () => undefined,
      forkGateway: (_entry, forkArgs, options) => {
        args = forkArgs
        forkedEnv = options.env as NodeJS.ProcessEnv
        return readyChild()
      },
    })
    await client.warmTranscription()
    expect(forkedEnv?.OIRA_WHISPER_MODEL_PATH).toBe("C:/models/whisper.bin")
    expect(forkedEnv?.OIRA_QWEN_MODEL_PATH).toBe("C:/models/qwen.gguf")
    expect(args?.[0]).toContain("whisper.bin")
    await client.shutdown()
  })

  it("keeps an inherited Vulkan pin without probing", async () => {
    const userData = await userDataDir()
    process.env.GGML_VK_VISIBLE_DEVICES = "1"
    let probed = false
    let forkedEnv: NodeJS.ProcessEnv | undefined
    const client = createQvacGatewayClient({
      resolvePaths: () => ({ userData, resourcesPath: userData, appPath: userData }),
      gatewayEntry: "gateway.js",
      probeVulkanIndex: async () => {
        probed = true
        return 0
      },
      forkGateway: (_entry, _args, options) => {
        forkedEnv = options.env as NodeJS.ProcessEnv
        return readyChild()
      },
    })
    await client.warmTranscription()
    expect(probed).toBe(false)
    expect(forkedEnv?.GGML_VK_VISIBLE_DEVICES).toBe("1")
    await client.shutdown()
  })

  it("starts a single gateway when warm is called concurrently", async () => {
    const userData = await userDataDir()
    let probes = 0
    let forks = 0
    let finishProbe!: (index: number) => void
    const probeWait = new Promise<number>((resolve) => { finishProbe = resolve })
    const client = createQvacGatewayClient({
      resolvePaths: () => ({ userData, resourcesPath: userData, appPath: userData }),
      gatewayEntry: "gateway.js",
      probeVulkanIndex: async () => {
        probes += 1
        return probeWait
      },
      forkGateway: () => {
        forks += 1
        return readyChild()
      },
    })
    const first = client.warmTranscription()
    const second = client.warmTranscription()
    finishProbe(1)
    await Promise.all([first, second])
    expect(probes).toBe(1)
    expect(forks).toBe(1)
    await client.shutdown()
  })
})
