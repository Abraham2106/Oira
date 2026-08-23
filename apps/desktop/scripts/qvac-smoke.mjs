import { spawn, spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import os from "node:os"
import { fileURLToPath } from "node:url"

const self = fileURLToPath(import.meta.url)
const LOAD_WATCHDOG_MS = 120_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

function readCpu() {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "(Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average",
    ],
    { encoding: "utf8" },
  )
  return Number(result.stdout.trim())
}

function assertResources() {
  if (os.freemem() < MIN_FREE_BYTES) {
    throw new Error("LOW_MEMORY")
  }
}

if (!process.versions.electron) {
  const electron = createRequire(import.meta.url)("electron")
  const child = spawn(electron, [self], {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  })
  let highStreak = 0
  const timer = setInterval(() => {
    const cpu = readCpu()
    const freeGB = os.freemem() / 1e9
    process.stderr.write(`watch cpu=${cpu} freeRAM_GB=${freeGB.toFixed(2)}\n`)
    if (cpu >= 98) highStreak += 1
    else highStreak = 0
    if (highStreak >= 2 || os.freemem() < MIN_FREE_BYTES) {
      process.stderr.write("ABORT resource limit\n")
      if (child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"])
      }
      clearInterval(timer)
      process.exit(98)
    }
  }, 1000)
  child.on("exit", (code) => {
    clearInterval(timer)
    process.exit(code ?? 1)
  })
} else {
  const { close, loadModel, unloadModel, WHISPER_SMALL_Q8_0 } = await import(
    "@qvac/sdk"
  )
  if (WHISPER_SMALL_Q8_0.name !== "WHISPER_SMALL_Q8_0") {
    throw new Error("SMOKE_MODEL_MISMATCH")
  }
  assertResources()
  let modelId
  try {
    modelId = await Promise.race([
      loadModel({
        modelSrc: WHISPER_SMALL_Q8_0,
        onProgress: (progress) => {
          assertResources()
          const percentage = Number(progress.percentage)
          if (Number.isFinite(percentage)) {
            process.stderr.write(`qvac.smoke ${Math.round(percentage)}\n`)
          }
        },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("LOAD_WATCHDOG")), LOAD_WATCHDOG_MS)
      }),
    ])
    await unloadModel({ modelId })
    process.stdout.write(
      `qvac.smoke ok expectedSize=${WHISPER_SMALL_Q8_0.expectedSize}\n`,
    )
  } finally {
    await close().catch(() => undefined)
  }
  process.exit(0)
}
