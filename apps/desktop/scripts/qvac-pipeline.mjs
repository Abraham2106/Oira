import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { createRequire } from "node:module"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { rejectOnTimeout } from "./watchdog.mjs"

const self = fileURLToPath(import.meta.url)
const here = dirname(self)
const VOICE_SAMPLE = join(here, "..", "eval", "audio", "voice-sample.wav")
const WHISPER_LOAD_WATCHDOG_MS = 120_000
const QWEN_LOAD_WATCHDOG_MS = 600_000
const COMPLETION_WATCHDOG_MS = 240_000
const PRELOAD_FREE_BYTES = 400 * 1024 * 1024
const WATCHDOG_FREE_BYTES = 200 * 1024 * 1024
const PHRASE =
  "Hola doctor, me duele la rodilla izquierda desde ayer. No me caí, apareció al caminar."

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
  if (os.freemem() < PRELOAD_FREE_BYTES) {
    throw new Error("LOW_MEMORY")
  }
}

function pickQwen(sdk) {
  const requested = process.env.NOTALOCAL_LLM?.trim()
  if (!requested || requested === "QWEN3_1_7B_INST_Q4") return sdk.QWEN3_1_7B_INST_Q4
  if (requested === "QWEN3_4B_INST_Q4_K_M") return sdk.QWEN3_4B_INST_Q4_K_M
  throw new Error("UNKNOWN_LLM")
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
      "try { $synth.SelectVoice('Microsoft Sabina Desktop') } catch { $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, (New-Object System.Globalization.CultureInfo 'es-MX')) }",
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

function segmentId(segment, index) {
  return segment.id == null ? `seg-${index + 1}` : String(segment.id)
}

function formatSegments(segments) {
  return segments
    .map((segment, index) => {
      const id = segmentId(segment, index)
      return `[${id}] ${String(segment.text ?? "").trim()}`
    })
    .filter((line) => !line.endsWith("] "))
}

function isInjection(text) {
  return /ignora\w*\s+las instrucciones|\bdiagnostica\b/i.test(text)
}

function isHistory(text) {
  return (
    !isInjection(text) &&
    /\b(gastritis|hipertensi[oó]n|diabetes|asm[aá]|alergias?|al[eé]rgic\w*|hipotiroid\w*|cirug[ií]as?)\b/i.test(
      text,
    )
  )
}

function isPlan(text) {
  return (
    !isInjection(text) &&
    /\b(recomiendo|pastillas?|ibuprofeno|paracetamol|omeprazol|profeno|miligramos?|\d+\s*mg)\b/i.test(
      text,
    )
  )
}

function similar(left, right) {
  const a = norm(left)
  const b = norm(right)
  if (!a || !b) return false
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.7) return true
  const tokensA = new Set(a.split(" ").filter((word) => word.length > 3))
  const tokensB = new Set(b.split(" ").filter((word) => word.length > 3))
  if (tokensA.size === 0 || tokensB.size === 0) return false
  let overlap = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1
  }
  return overlap / Math.min(tokensA.size, tokensB.size) >= 0.75
}

function joinBits(bits) {
  if (bits.length === 0) return emptyField()
  return statedField(
    bits.map((bit) => bit.text.trim()).join(" "),
    bits.map((bit) => bit.id),
  )
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function emptyField() {
  return { text: "", presence: "NOT_STATED", sourceSegmentIds: [] }
}

function statedField(text, sourceSegmentIds) {
  return { text, presence: "STATED", sourceSegmentIds }
}

function sanitizeDump(parsed, spoken, segments) {
  const allowed = new Set(
    [...spoken.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]),
  )
  if (allowed.size === 0) allowed.add("seg-1")
  const keep = new Set(["visit_context", "clinical_narrative"])
  const norm = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")

  for (const id of SECTIONS) {
    const field = parsed.sections[id]
    const text = String(field?.text ?? "").trim()
    const sources = Array.isArray(field?.sourceSegmentIds)
      ? field.sourceSegmentIds.filter((sourceId) => allowed.has(sourceId))
      : []
    parsed.sections[id] = text
      ? statedField(text, sources)
      : emptyField()
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
      parsed.sections[id] = emptyField()
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
        parsed.sections[id] = emptyField()
      }
    }
  }

  const usable = segments
    .map((segment, index) => ({
      id: segmentId(segment, index),
      text: String(segment.text ?? "").trim(),
    }))
    .filter((segment) => segment.text.length > 0)
  const historyBits = usable.filter((segment) => isHistory(segment.text))
  const planBits = usable.filter((segment) => isPlan(segment.text))
  const otherBits = usable.filter(
    (segment) => !isHistory(segment.text) && !isPlan(segment.text),
  )
  const rebuild =
    usable.length >= 2 &&
    (similar(
      parsed.sections.visit_context.text,
      parsed.sections.clinical_narrative.text,
    ) ||
      parsed.sections.visit_context.sourceSegmentIds.length >= 3)
  if (rebuild && otherBits.length > 0) {
    parsed.sections.visit_context = joinBits([otherBits[0]])
    parsed.sections.clinical_narrative = joinBits(otherBits.slice(1))
  }
  if (!parsed.sections.relevant_history.text && historyBits.length > 0) {
    parsed.sections.relevant_history = joinBits(historyBits)
  }
  if (!parsed.sections.clinician_documented_plan.text && planBits.length > 0) {
    parsed.sections.clinician_documented_plan = joinBits(planBits)
  }

  return parsed
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
    if (highStreak >= 2 || os.freemem() < WATCHDOG_FREE_BYTES) {
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
  const dir = mkdtempSync(join(tmpdir(), "nl-pipeline-"))
  const wavPath = existsSync(VOICE_SAMPLE)
    ? VOICE_SAMPLE
    : join(dir, "phrase.wav")
  try {
    if (wavPath === VOICE_SAMPLE) {
      process.stderr.write(`qvac.pipeline using ${VOICE_SAMPLE}\n`)
    } else {
      synthesizeWav(wavPath)
    }

    const whisperSdk = await import("@qvac/sdk")
    const {
      close: closeWhisper,
      loadModel: loadWhisper,
      transcribe,
      unloadModel: unloadWhisper,
      WHISPER_SMALL_Q8_0,
    } = whisperSdk
    assertResources()
    let whisperModelId
    let spokenLines = ""
    let whisperSegments = []
    try {
      whisperModelId = await Promise.race([
        loadWhisper({
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
            ...(process.env.NOTALOCAL_STT_PROMPT === "1"
              ? {
                  initial_prompt:
                    "ibuprofeno, paracetamol, omeprazol, amoxicilina, enalapril, metformina, salbutamol, miligramos",
                }
              : {}),
          },
          onProgress: (progress) => {
            const percentage = Number(progress.percentage)
            if (Number.isFinite(percentage)) {
              process.stderr.write(`qvac.pipeline whisper ${Math.round(percentage)}\n`)
            }
          },
        }),
        rejectOnTimeout(WHISPER_LOAD_WATCHDOG_MS, () => new Error("LOAD_WATCHDOG")),
      ])
      const segments = await transcribe({
        modelId: whisperModelId,
        audioChunk: wavPath,
        metadata: true,
      })
      whisperSegments = segments
      const text = segments.map((segment) => segment.text).join("").trim()
      const lines = formatSegments(segments)
      spokenLines = lines.join("\n")
      process.stdout.write(`qvac.pipeline spoken=${JSON.stringify(PHRASE)}\n`)
      process.stdout.write(`qvac.pipeline text=${JSON.stringify(text)}\n`)
      process.stdout.write(`${spokenLines}\n`)
    } finally {
      if (whisperModelId) {
        await unloadWhisper({ modelId: whisperModelId }).catch(() => undefined)
      }
      await closeWhisper().catch(() => undefined)
    }

    process.stdout.write("qvac.pipeline stt closed before llm load\n")

    const qwenSdk = await import("@qvac/sdk")
    const {
      close: closeQwen,
      completion,
      loadModel: loadQwen,
      unloadModel: unloadQwen,
    } = qwenSdk
    const qwenSrc = pickQwen(qwenSdk)
    process.stdout.write(`qvac.pipeline llm=${qwenSrc.name}\n`)
    assertResources()
    let qwenModelId
    try {
      qwenModelId = await Promise.race([
        loadQwen({
          modelSrc: qwenSrc,
          onProgress: (progress) => {
            const percentage = Number(progress.percentage)
            if (Number.isFinite(percentage)) {
              process.stderr.write(`qvac.pipeline qwen ${Math.round(percentage)}\n`)
            }
          },
        }),
        rejectOnTimeout(QWEN_LOAD_WATCHDOG_MS, () => new Error("LOAD_WATCHDOG")),
      ])
      const run = completion({
        modelId: qwenModelId,
        history: [
          {
            role: "system",
            content:
              "Eres un asistente de documentación clínica. Extrae SOLO lo explícito. JSON only. No diagnostiques. NOT_STATED exige text vacío. PROHIBIDO copiar la misma frase en las 7 secciones. assessment/plan/follow_up vacíos si el médico no los verbaliza. Ejemplo: solo dolor de rodilla → visit_context y clinical_narrative STATED; el resto NOT_STATED. /no_think",
          },
          {
            role: "user",
            content: `Extrae la nota. Deja vacías las secciones sin evidencia.\n<<<TRANSCRIPCION_INICIO>>>\n${spokenLines}\n<<<TRANSCRIPCION_FIN>>>`,
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
      process.stderr.write(
        `qvac.pipeline tokensPerSecond=${raw.stats?.tokensPerSecond ?? "n/a"} backendDevice=${raw.stats?.backendDevice ?? "n/a"}\n`,
      )
      const parsed = sanitizeDump(JSON.parse(raw.contentText), spokenLines, whisperSegments)
      process.stdout.write(`qvac.pipeline note=${JSON.stringify(parsed, null, 2)}\n`)
    } finally {
      if (qwenModelId) {
        await unloadQwen({ modelId: qwenModelId }).catch(() => undefined)
      }
      await closeQwen().catch(() => undefined)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  process.exit(0)
}
