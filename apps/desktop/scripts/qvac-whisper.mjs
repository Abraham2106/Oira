import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createRequire } from "node:module"
import os from "node:os"
import { fileURLToPath } from "node:url"

const self = fileURLToPath(import.meta.url)
const LOAD_WATCHDOG_MS = 120_000
const MIN_FREE_BYTES = 800 * 1024 * 1024
const PHRASE = "Hola, me duele la rodilla izquierda."

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

function synthesizeWav(wavPath) {
  const scriptPath = `${wavPath}.ps1`
  const escapedWav = wavPath.replaceAll("'", "''")
  const escapedPhrase = PHRASE.replaceAll("'", "''")
  writeFileSync(
    scriptPath,
    [
      "Add-Type -AssemblyName System.Speech",
      "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      "$synth.Rate = -2",
      `$synth.SetOutputToWaveFile('${escapedWav}')`,
      `$synth.Speak('${escapedPhrase}')`,
      "$synth.Dispose()",
    ].join("\r\n"),
    { encoding: "utf8" },
  )
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
    { encoding: "utf8" },
  )
  rmSync(scriptPath, { force: true })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "TTS_FAILED")
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
  const dir = mkdtempSync(join(tmpdir(), "nl-whisper-"))
  const wavPath = join(dir, "phrase.wav")
  try {
    synthesizeWav(wavPath)
    const { close, loadModel, transcribe, unloadModel, WHISPER_SMALL_Q8_0 } =
      await import("@qvac/sdk")
    assertResources()
    let modelId
    try {
      modelId = await Promise.race([
        loadModel({
          modelSrc: WHISPER_SMALL_Q8_0,
          modelConfig: {
            language: "es",
            translate: false,
            temperature: 0,
            suppress_blank: true,
            suppress_nst: true,
            no_context: true,
            no_timestamps: false,
            strategy: "beam_search",
            beam_search_beam_size: 5,
          },
          onProgress: (progress) => {
            assertResources()
            const percentage = Number(progress.percentage)
            if (Number.isFinite(percentage)) {
              process.stderr.write(`qvac.whisper ${Math.round(percentage)}\n`)
            }
          },
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("LOAD_WATCHDOG")), LOAD_WATCHDOG_MS)
        }),
      ])
      const segments = await transcribe({
        modelId,
        audioChunk: wavPath,
        metadata: true,
      })
      const text = segments.map((segment) => segment.text).join("").trim()
      process.stdout.write(`qvac.whisper spoken=${JSON.stringify(PHRASE)}\n`)
      process.stdout.write(`qvac.whisper segments=${segments.length}\n`)
      process.stdout.write(`qvac.whisper text=${JSON.stringify(text)}\n`)
      await unloadModel({ modelId })
    } finally {
      await close().catch(() => undefined)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  process.exit(0)
}
