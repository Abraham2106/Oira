import { spawn, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { rejectOnTimeout } from "./watchdog.mjs"

const self = fileURLToPath(import.meta.url)
const LOAD_WATCHDOG_MS = 600_000
const COMPLETION_WATCHDOG_MS = 240_000
const MIN_FREE_BYTES = 400 * 1024 * 1024

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
  const { close, completion, loadModel, unloadModel, QWEN3_1_7B_INST_Q4 } =
    await import("@qvac/sdk")
  assertResources()
  let modelId
  try {
    modelId = await Promise.race([
      loadModel({
        modelSrc: QWEN3_1_7B_INST_Q4,
        onProgress: (progress) => {
          const percentage = Number(progress.percentage)
          if (Number.isFinite(percentage)) {
            process.stderr.write(`qvac.qwen ${Math.round(percentage)}\n`)
          }
        },
      }),
      rejectOnTimeout(LOAD_WATCHDOG_MS, () => new Error("LOAD_WATCHDOG")),
    ])
    const spoken = (
      process.env.QWEN_TRANSCRIPT_FILE
        ? readFileSync(process.env.QWEN_TRANSCRIPT_FILE, "utf8")
        : process.env.QWEN_TRANSCRIPT
    )?.trim() ||
      "[seg-1] Hola doctor, me duele la rodilla izquierda desde ayer.\n[seg-2] No me caí, apareció al caminar."
    const run = completion({
      modelId,
      history: [
        {
          role: "system",
          content:
            "Eres un asistente de documentación clínica. Extrae SOLO lo explícito. JSON only. No diagnostiques. NOT_STATED exige text vacío. PROHIBIDO copiar la misma frase en las 7 secciones. assessment/plan/follow_up vacíos si el médico no los verbaliza. Ejemplo: solo dolor de rodilla → visit_context y clinical_narrative STATED; el resto NOT_STATED. /no_think",
        },
        {
          role: "user",
          content: `Extrae la nota. Deja vacías las secciones sin evidencia.\n<<<TRANSCRIPCION_INICIO>>>\n${spoken}\n<<<TRANSCRIPCION_FIN>>>`,
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
        rejectOnTimeout(COMPLETION_WATCHDOG_MS, () => new Error("COMPLETION_WATCHDOG")),
    ])
    process.stderr.write("\n")
    const parsed = JSON.parse(raw.contentText)
    const allowed = new Set(
      [...spoken.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]),
    )
    if (allowed.size === 0) allowed.add("seg-1")
    const keep = new Set(["visit_context", "clinical_narrative"])
    const norm = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
    for (const id of SECTIONS) {
      const field = parsed.sections[id]
      const text = String(field?.text ?? "").trim()
      const sources = Array.isArray(field?.sourceSegmentIds)
        ? field.sourceSegmentIds.filter((sourceId) => allowed.has(sourceId))
        : []
      parsed.sections[id] = text
        ? { text, presence: "STATED", sourceSegmentIds: sources }
        : { text: "", presence: "NOT_STATED", sourceSegmentIds: [] }
    }
    const primaryKeys = new Set(
      [...keep].map((id) => norm(parsed.sections[id].text)).filter(Boolean),
    )
    const combo = norm(
      `${parsed.sections.visit_context.text} ${parsed.sections.clinical_narrative.text}`,
    )
    for (const id of SECTIONS) {
      if (keep.has(id)) continue
      const key = norm(parsed.sections[id].text)
      if (key && (primaryKeys.has(key) || key === combo)) {
        parsed.sections[id] = { text: "", presence: "NOT_STATED", sourceSegmentIds: [] }
      }
    }
    const counts = new Map()
    for (const id of SECTIONS) {
      const key = norm(parsed.sections[id].text)
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const dump = [...counts.entries()].find(([, n]) => n >= 3)?.[0]
    if (dump) {
      for (const id of SECTIONS) {
        if (norm(parsed.sections[id].text) === dump && !keep.has(id)) {
          parsed.sections[id] = { text: "", presence: "NOT_STATED", sourceSegmentIds: [] }
        }
      }
    }
    process.stdout.write(`qvac.qwen text=${JSON.stringify(parsed, null, 2)}\n`)
    await unloadModel({ modelId })
  } finally {
    await close().catch(() => undefined)
  }
  process.exit(0)
}
