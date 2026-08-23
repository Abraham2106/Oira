import { spawn, spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import os from "node:os"
import { fileURLToPath } from "node:url"

const self = fileURLToPath(import.meta.url)
const LOAD_WATCHDOG_MS = 120_000
const COMPLETION_WATCHDOG_MS = 180_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

const FIELD = {
  type: "object",
  additionalProperties: false,
  required: ["text", "presence", "sourceSegmentIds"],
  properties: {
    text: { type: "string" },
    presence: { type: "string", enum: ["STATED", "NOT_STATED", "UNKNOWN"] },
    sourceSegmentIds: { type: "array", items: { type: "string" } },
  },
}

const SECTIONS = [
  "visit_context",
  "clinical_narrative",
  "relevant_history",
  "reported_findings",
  "clinician_documented_assessment",
  "clinician_documented_plan",
  "follow_up",
]

const NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    sections: {
      type: "object",
      additionalProperties: false,
      required: SECTIONS,
      properties: Object.fromEntries(SECTIONS.map((id) => [id, FIELD])),
    },
  },
}

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
    if (highStreak >= 2 || os.freemem() < 200 * 1024 * 1024) {
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
  const { close, completion, loadModel, unloadModel, QWEN3_600M_INST_Q4 } =
    await import("@qvac/sdk")
  assertResources()
  let modelId
  try {
    modelId = await Promise.race([
      loadModel({
        modelSrc: QWEN3_600M_INST_Q4,
        onProgress: (progress) => {
          assertResources()
          const percentage = Number(progress.percentage)
          if (Number.isFinite(percentage)) {
            process.stderr.write(`qvac.qwen ${Math.round(percentage)}\n`)
          }
        },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("LOAD_WATCHDOG")), LOAD_WATCHDOG_MS)
      }),
    ])
    const run = completion({
      modelId,
      history: [
        {
          role: "system",
          content:
            "Eres un asistente de documentación clínica. Extrae SOLO lo dicho. JSON only. No diagnostiques. /no_think",
        },
        {
          role: "user",
          content:
            "<<<TRANSCRIPCION_INICIO>>>\n[seg-1] Hola doctor, me duele la rodilla izquierda desde ayer.\n[seg-2] No me caí, apareció al caminar.\n<<<TRANSCRIPCION_FIN>>>",
        },
      ],
      stream: true,
      kvCache: false,
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "clinical_note", schema: NOTE_SCHEMA },
      },
      generationParams: { temp: 0, seed: 42, predict: 2048, reasoning_budget: 0 },
    })
    for await (const event of run.events) {
      if (event.type === "contentDelta") {
        process.stderr.write(".")
      }
    }
    const raw = await Promise.race([
      run.final,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("COMPLETION_WATCHDOG")), COMPLETION_WATCHDOG_MS)
      }),
    ])
    process.stderr.write("\n")
    process.stdout.write(`qvac.qwen text=${raw.contentText}\n`)
    await unloadModel({ modelId })
  } finally {
    await close().catch(() => undefined)
  }
  process.exit(0)
}
