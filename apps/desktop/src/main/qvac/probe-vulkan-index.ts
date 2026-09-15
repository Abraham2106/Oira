import { spawn } from "node:child_process"

export function parseVulkanProbeOutput(stdout: string): number | undefined {
  const lines = stdout.trim().split(/\r?\n/).reverse()
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { ok?: boolean; vulkanIndex?: number }
      if (parsed.ok === true && typeof parsed.vulkanIndex === "number" && parsed.vulkanIndex >= 0) {
        return parsed.vulkanIndex
      }
    } catch {
      /* probe logs may precede the JSON line */
    }
  }
  return undefined
}

export function probeDiscreteVulkanIndex(input: {
  execPath: string
  probeEntry: string
  env: NodeJS.ProcessEnv
  timeoutMs?: number
  spawnProcess?: typeof spawn
}): Promise<number | undefined> {
  if (process.platform === "darwin") return Promise.resolve(undefined)
  const run = input.spawnProcess ?? spawn
  return new Promise((resolve) => {
    const child = run(input.execPath, [input.probeEntry], {
      env: { ...input.env, ELECTRON_RUN_AS_NODE: "1" },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let settled = false
    child.stdout?.on("data", (chunk: Buffer | string) => { stdout += chunk.toString() })
    const finish = () => {
      if (settled) return
      settled = true
      resolve(parseVulkanProbeOutput(stdout))
    }
    const timer = setTimeout(() => {
      child.kill()
      finish()
    }, input.timeoutMs ?? 20_000)
    child.once("exit", () => {
      clearTimeout(timer)
      finish()
    })
    child.once("error", () => {
      clearTimeout(timer)
      finish()
    })
  })
}
