import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { createQvacClient, createOfflineQvacRuntime } from "./qvac.client"
import { createTranscriptionAdapter } from "./transcription.adapter"

const mainRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full))
      continue
    }
    if (full.endsWith(".ts")) out.push(full)
  }
  return out
}

describe("qvac boundary", () => {
  it("is the only folder allowed to import @qvac/sdk", () => {
    const offenders: string[] = []
    for (const file of walkTs(mainRoot)) {
      const src = readFileSync(file, "utf8")
      if (!src.includes('from "@qvac/sdk"') && !src.includes("from '@qvac/sdk'")) {
        continue
      }
      if (!file.includes(`${join("main", "qvac")}`) && !file.replaceAll("\\", "/").includes("main/qvac/")) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("createQvacClient", () => {
  it("does not keep STT and structuring loaded at once", async () => {
    const unloaded: string[] = []
    const runtime = createOfflineQvacRuntime()
    const originalUnload = runtime.unloadModel.bind(runtime)
    runtime.unloadModel = async (modelId) => {
      unloaded.push(modelId)
      await originalUnload(modelId)
    }
    const client = createQvacClient({
      runtime,
      modelSrc: { stt: "whisper-offline", structuring: "qwen-offline" },
    })
    await client.ensureModel("stt")
    expect(client.isReady("stt")).toBe(true)
    await client.ensureModel("structuring")
    expect(client.isReady("stt")).toBe(false)
    expect(client.isReady("structuring")).toBe(true)
    expect(unloaded.some((id) => id.includes("stt"))).toBe(true)
  })

  it("transcription adapter has no encounter parameter", () => {
    const client = createQvacClient({
      runtime: createOfflineQvacRuntime(),
      modelSrc: { stt: "whisper-offline" },
    })
    const adapter = createTranscriptionAdapter(client)
    expect(adapter.transcribeFile.length).toBe(1)
  })
})
