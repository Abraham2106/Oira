/**
 * Oira Capa A eval runner: gold transcript → structuring → score → reports.
 * Default: --skip-stt. Does not modify product prompts.
 *
 * Prefer launching via `pnpm eval` (register-ts + transform-types).
 * QVAC still re-execs under Electron as Node for @qvac/sdk.
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, statSync } from "node:fs"
import { cpus, platform, arch } from "node:os"
import { dirname, join, resolve } from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath, pathToFileURL } from "node:url"
import { inspect } from "node:util"
import { coldHotMetrics, computeRepeatability, evaluateCase, latencyStats, presenceMetrics, summarize } from "./scorer/index.mjs"
import { summarizeStt, transcriptText } from "./scorer/stt-metrics.mjs"
import { buildArtifacts } from "./report.mjs"
import { appendHistory, historyEntry } from "./history.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DESKTOP = join(ROOT, "apps", "desktop")
const FIXTURES = join(ROOT, "eval", "fixtures")
const AUDIO = join(ROOT, "eval", "audio")
const HISTORY = join(ROOT, "eval", "history.jsonl")
const require = createRequire(join(DESKTOP, "package.json"))
const SELF = fileURLToPath(import.meta.url)

/**
 * Fase 3: resumir latencia por fase + breakdown frío/caliente sobre run.results.
 * Comparte shape entre el run principal y --replay (ambos derivan de run.json).
 * sttLatency solo cuando hay transcribeMs numéricos; coldHot requiere warmup.
 */
function finalizeLatencySummary(run) {
  run.summary.sttLatency = latencyStats(
    run.results.map((r) => r.transcribeMs).filter((n) => Number.isFinite(n)),
  )
  run.summary.coldHot = coldHotMetrics(
    Number.isFinite(run.warmup?.ms) ? run.warmup.ms : null,
    run.results.map((r) => r.latencyMs),
  )
}

function helpText() {
  return `Uso: pnpm eval [flags]

Evaluación Oira por capas (default: --e2e). Etiquetas: medido | observado | inferido | no_probado.

Stages (mutuamente excluyentes):
  --e2e            (default) Capa C: audio → STT → estructuración sobre la hipótesis de
                   Whisper → presencia I4 vs gold + delta gold-fed→STT-fed. Solo casos con WAV.
  --skip-stt       Capa A: estructuración sobre transcripción gold. Todos los casos.
  --with-stt       Capa B: solo STT (WER/CER), sin estructuración. Solo casos con WAV.

Otros flags:
  --replay <run.json>     Re-render + re-score determinístico (nunca re-inferencia).
  --repeats <N>           Repetir el corpus N veces (default 1; solo --e2e/--with-stt).
                          Warmup solo en la 1ra iteración; calcula varianza (CV).
  --compare <paths...>    Comparar 2+ runs side-by-side (paths a run.json o dirs).
  --cases "01,05,02"      Subconjunto de casos del manifest.
  --adapter qvac|heuristic  Adapter de modelos (default qvac; qvac requiere GPU/Whisper local).
  --output-dir <dir>      Directorio de salida (default reports/).
  --self-check            Tests sin modelos.
  --help                  Muestra esta ayuda.

Ejemplos:
  pnpm eval                                      # Capa C (e2e, default)
  pnpm eval -- --skip-stt                        # Capa A
  pnpm eval -- --with-stt                        # Capa B
  pnpm eval -- --replay reports/<run-id>/run.json
  pnpm eval -- --repeats 5                       # Repeatability study (5 runs)
  pnpm eval -- --compare reports/run1/run.json reports/run2/run.json
`
}

function parseArgs(argv) {
  const args = {
    stage: "e2e",
    selfCheck: false,
    replay: null,
    cases: null,
    adapter: "qvac",
    outputRoot: join(ROOT, "reports"),
    repeats: 1,
    compare: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--self-check") args.selfCheck = true
    else if (a === "--skip-stt") args.stage = "off"
    else if (a === "--with-stt") args.stage = "sttOnly"
    else if (a === "--e2e") args.stage = "e2e"
    else if (a === "--replay") args.replay = argv[++i]
    else if (a === "--repeats") args.repeats = Math.max(1, parseInt(argv[++i], 10) || 1)
    else if (a === "--compare") {
      const paths = []
      while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        paths.push(argv[++i])
      }
      if (!paths.length) throw new Error("--compare requiere al menos un path a run.json o directorio")
      args.compare = paths
    }
    else if (a === "--cases") {
      args.cases = argv[++i].split(",").map((s) => s.trim()).filter(Boolean)
    } else if (a === "--adapter") args.adapter = argv[++i]
    else if (a === "--output-dir") args.outputRoot = resolve(ROOT, argv[++i])
    else if (a === "--help") args.help = true
  }
  if (!args.help) {
    const explicit = new Set(argv)
    if (args.compare) {
      if (args.replay || args.selfCheck || explicit.has("--e2e") || explicit.has("--with-stt") || explicit.has("--skip-stt") || args.cases) {
        throw new Error("--compare es mutuamente excluyente con --replay, --self-check, stages y --cases")
      }
    } else {
      if (explicit.has("--e2e") && (explicit.has("--with-stt") || explicit.has("--skip-stt"))) {
        throw new Error("--e2e es mutuamente excluyente con --with-stt y --skip-stt.")
      }
      if (explicit.has("--with-stt") && explicit.has("--skip-stt")) {
        throw new Error("--with-stt y --skip-stt son mutuamente excluyentes.")
      }
      if (args.repeats > 1 && args.stage === "off") {
        throw new Error("--repeats solo aplica a --e2e (default) y --with-stt")
      }
    }
  }
  return args
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n")
}

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" })
  if (result.status !== 0) return null
  return result.stdout.trim()
}

function loadManifest(caseFilter) {
  const manifest = readJson(join(FIXTURES, "cases.json"))
  let cases = manifest.cases
  if (caseFilter?.length) {
    cases = cases.filter((c) =>
      caseFilter.some((id) => c.id === id || c.id.startsWith(id) || c.id.includes(id)),
    )
    if (cases.length === 0) {
      throw new Error(`Ningún caso coincide con --cases ${caseFilter.join(",")}`)
    }
  }
  return cases.map((entry) => {
    const dir = join(FIXTURES, entry.id)
    const audioPath = join(AUDIO, entry.id, "audio.wav")
    return {
      id: entry.id,
      category: entry.category,
      script: readFileSync(join(dir, "script.txt"), "utf8"),
      transcript: readJson(join(dir, "transcript.json")),
      gold: readJson(join(dir, "gold.json")),
      audioRef: existsSync(audioPath) ? audioPath : undefined,
    }
  })
}

function datasetHash() {
  const hash = createHash("sha256")
  const walk = (dir, prefix = "", opts = {}) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith("_")) continue
      const path = join(dir, name)
      const rel = `${prefix}${name}`
      if (statSync(path).isDirectory()) {
        walk(path, `${rel}/`, opts)
        continue
      }
      const ok = opts.audio
        ? name.endsWith(".wav")
        : name.endsWith(".json") || name.endsWith(".txt")
      if (!ok) continue
      hash.update(rel)
      hash.update(readFileSync(path))
    }
  }
  walk(FIXTURES)
  walk(AUDIO, "audio/", { audio: true })
  return hash.digest("hex")
}

function ensureQvacElectronRuntime() {
  if (process.versions.electron) return
  const electronBin = require("electron")
  const child = spawnSync(
    electronBin,
    [
      "--experimental-transform-types",
      "--import",
      pathToFileURL(join(ROOT, "eval", "register-ts.mjs")).href,
      "--disable-warning=ExperimentalWarning",
      SELF,
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      cwd: DESKTOP,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        QVAC_CONFIG_PATH:
          process.env.QVAC_CONFIG_PATH ?? join(ROOT, "qvac.config.mjs"),
      },
    },
  )
  process.exit(child.status ?? 1)
}

async function importDesktopTs(relFromDesktopSrc) {
  const url = pathToFileURL(join(DESKTOP, "src", relFromDesktopSrc)).href
  return import(url)
}

async function createAdapter(name) {
  if (name === "heuristic") {
    const { createHeuristicStructuring } = await importDesktopTs(
      "main/structure/heuristic-structuring.ts",
    )
    return {
      name: "heuristic",
      structuringLabel: "heuristic-assembler",
      async warm() {},
      async structure(transcript) {
        const port = createHeuristicStructuring()
        const result = await port.structure({ transcript })
        return { note: result.note, rawSdkText: null }
      },
      async close() {},
      // Fase 4: heuristic no tiene prompt/schema configurables
      getPromptTemplate() {
        return ""
      },
      getSchema() {
        return {}
      },
    }
  }

  if (name !== "qvac") throw new Error(`Adapter no soportado: ${name}`)
  ensureQvacElectronRuntime()

  const { createQvacInferenceRuntime } = await importDesktopTs(
    "main/qvac/inference-runtime.ts",
  )
  const { createQwenStructuring } = await importDesktopTs("main/qvac/qwen-structuring.ts")
  const { SYSTEM_PROMPT } = await importDesktopTs("main/structure/prompt.ts")
  const { CLINICAL_NOTE_JSON_SCHEMA } = await importDesktopTs(
    "main/structure/json-schema.ts",
  )
  const runtime = createQvacInferenceRuntime()
  const structuring = createQwenStructuring({ runtime })
  let lastRaw = null

  const originalComplete = runtime.completeStructuring.bind(runtime)
  runtime.completeStructuring = async (input) => {
    const completion = await originalComplete(input)
    lastRaw = completion
    return completion
  }

  return {
    name: "qvac",
    structuringLabel: "QWEN3_4B_Q4_K_M",
    transcribingLabel: "WHISPER_QVAC_LOCAL",
    async warm() {
      await runtime.handoffToStructuring()
    },
    async warmTranscribe() {
      await runtime.warmTranscription()
    },
    async transcribe(filePath) {
      const raw = await runtime.transcribe({ filePath })
      return raw.map((segment) => ({
        id: String(segment.id ?? `seg-${segment.startMs}`),
        text: segment.text,
        startMs: segment.startMs,
      }))
    },
    async structure(transcript) {
      lastRaw = null
      const result = await structuring.structure({ transcript })
      const rawSdkText =
        [lastRaw?.text, lastRaw?.rawText, lastRaw?.thinkingText]
          .map((v) => v?.trim() ?? "")
          .find((v) => v.length > 0) ?? null
      if (result.kind !== "note") {
        // F1: nunca un éxito silencioso. El borrador no validado aparece como
        // error explícito con el texto crudo conservado para inspección.
        return {
          note: null,
          error: `draft_unvalidated: ${result.issues
            .map((issue) => `${issue.code}: ${issue.message}`)
            .join(" | ")}`,
          draftText: result.draftText,
          rawSdkText: result.draftText || rawSdkText,
          rawCompletion: lastRaw,
        }
      }
      return { note: result.note, rawSdkText, rawCompletion: lastRaw }
    },
    async close() {
      await runtime.shutdown()
    },
    getPromptTemplate() {
      return SYSTEM_PROMPT
    },
    getSchema() {
      return CLINICAL_NOTE_JSON_SCHEMA
    },
  }
}

function writeRunArtifacts(dir, run) {
  mkdirSync(dir, { recursive: true })
  writeJson(join(dir, "run.json"), run)
  const { metrics, cases, errors, reportMarkdown } = buildArtifacts(run)
  writeJson(join(dir, "metrics.json"), metrics)
  writeJson(join(dir, "cases.json"), cases)
  writeJson(join(dir, "errors.json"), errors)
  writeFileSync(join(dir, "REPORT.md"), reportMarkdown)
  return join(dir, "run.json")
}

const evidence = (kind, text) => `**${kind}.** ${text}`

/**
 * Fase 4: modo --compare. Lee N run.json y genera COMPARISON.md side-by-side.
 */
async function compareMode(paths, outputRoot) {
  const runs = []
  for (const p of paths) {
    const absolute = resolve(p)
    let runPath = absolute
    if (statSync(absolute).isDirectory()) {
      runPath = join(absolute, "run.json")
    }
    const run = readJson(runPath)
    if (!run.metadata?.runId || !run.summary) {
      throw new Error(`Run inválido (falta metadata.runId o summary): ${runPath}`)
    }
    runs.push({ path: runPath, run })
  }
  if (runs.length < 2) throw new Error("--compare requiere al menos 2 runs válidos")

  const outDir = outputRoot
  mkdirSync(outDir, { recursive: true })

  const metricRows = [
    { key: "WER", label: "WER", fmt: (s) => s.stt?.meanWer !== undefined && Number.isFinite(s.stt.meanWer) ? `${(s.stt.meanWer * 100).toFixed(1)}%` : "N/A" },
    { key: "CER", label: "CER", fmt: (s) => s.stt?.meanCer !== undefined && Number.isFinite(s.stt.meanCer) ? `${(s.stt.meanCer * 100).toFixed(1)}%` : "N/A" },
    { key: "presenceAccuracy", label: "Presence accuracy (STT-fed)", fmt: (s) => s.presence?.accuracy !== undefined && Number.isFinite(s.presence.accuracy) ? `${(s.presence.accuracy * 100).toFixed(1)}%` : "N/A" },
    { key: "latencyE2E", label: "Latency E2E p50 (ms)", fmt: (s) => s.latency?.p50 !== undefined && Number.isFinite(s.latency.p50) ? s.latency.p50.toFixed(1) : "N/A" },
    { key: "latencySTT", label: "Latency STT p50 (ms)", fmt: (s) => s.sttLatency?.p50 !== undefined && Number.isFinite(s.sttLatency.p50) ? s.sttLatency.p50.toFixed(1) : "N/A" },
    { key: "latencyStructure", label: "Latency structure p50 (ms)", fmt: (s) => s.structureLatency?.p50 !== undefined && Number.isFinite(s.structureLatency.p50) ? s.structureLatency.p50.toFixed(1) : "N/A" },
    { key: "coldHotRatio", label: "Cold/Hot ratio", fmt: (s) => s.coldHot?.ratio !== undefined && Number.isFinite(s.coldHot.ratio) ? `${s.coldHot.ratio.toFixed(2)}×` : "N/A" },
    { key: "datasetCases", label: "Dataset", fmt: (s) => s.cases ? `${s.cases} casos` : "N/A" },
    { key: "adapter", label: "Adapter", fmt: (s) => s.stt?.status === "medido" ? "qvac" : "heuristic" },
  ]

  const metaRows = [
    { key: "promptHash", label: "Prompt hash" },
    { key: "schemaHash", label: "Schema hash" },
    { key: "gitCommit", label: "Git commit" },
    { key: "startedAt", label: "Fecha" },
  ]

  let md = `### Comparación de configuraciones\n\n`
  md += `| Métrica | ${runs.map((r) => r.run.metadata.runId).join(" | ")} |\n`
  md += `| --- | ${runs.map(() => "---:").join(" | ")} |\n`

  for (const row of metricRows) {
    md += `| ${row.label} | ${runs.map((r) => row.fmt(r.run.summary)).join(" | ")} |\n`
  }
  md += `\n`
  md += `| --- | ${runs.map(() => "---:").join(" | ")} |\n`
  for (const row of metaRows) {
    md += `| ${row.label} | ${runs.map((r) => r.run.metadata[row.key] ?? "N/A").join(" | ")} |\n`
  }
  md += `\n${evidence("Observado", "Comparación de corridas existentes; no hay re-inferencia.")}`

  writeFileSync(join(outDir, "COMPARISON.md"), md)
  console.log(`Comparison written to ${join(outDir, "COMPARISON.md")}`)
}

async function replay(path) {
  const absolute = resolve(path)
  const run = readJson(absolute)
  if (!run.results?.length) throw new Error("Artefacto de replay incompleto.")
  const stage = run.metadata?.stage ?? (run.metadata?.skipStt === false ? "sttOnly" : "off")
  const isSttRun = stage !== "off"
  for (const r of run.results) {
    r.evaluation = evaluateCase({
      gold: r.gold,
      transcript: r.transcript,
      note: r.note,
      error: r.error,
      latencyMs: r.latencyMs,
      rawSdkText: r.rawSdkText,
    })
  }
  run.summary = summarize(
    run.results.map((r) => ({
      id: r.id,
      evaluation: r.evaluation,
      error: r.error,
      latencyMs: r.latencyMs,
    })),
  )
  if (stage === "e2e") {
    const { presenceMetrics, latencyStats } = await import("./scorer/index.mjs")
    const withBaseline = run.results.filter((r) => Array.isArray(r.baselinePresencePairs))
    run.summary.baselinePresence = presenceMetrics(
      withBaseline.flatMap((r) => r.baselinePresencePairs),
    )
    run.summary.structureLatency = latencyStats(
      run.results.map((r) => r.structureMs).filter((n) => Number.isFinite(n)),
    )
  }
  finalizeLatencySummary(run)
  if (isSttRun) {
    const { computeSttMetrics, summarizeStt } = await import("./scorer/stt-metrics.mjs")
    const sttPairs = run.results.filter((r) => r.stt && r.stt.reference && r.stt.hypothesis)
    const sttResults = sttPairs.map((r) => ({
      id: r.id,
      category: r.category,
      metrics: computeSttMetrics({
        reference: r.stt.reference,
        hypothesis: r.stt.hypothesis,
      }),
    }))
    const confusions = sttPairs.map((r) => ({
      reference: r.stt.reference,
      hypothesis: r.stt.hypothesis,
    }))
    const transcribeAttemptsMap = Object.fromEntries(
      run.results.map((r) => [r.id, typeof r.transcribeAttempts === "number" ? r.transcribeAttempts : 1]),
    )
    run.summary.stt = sttResults.length
      ? summarizeStt(sttResults, { confusions, transcribeAttempts: transcribeAttemptsMap })
      : run.summary.stt
  }
  run.metadata.rescoredAt = new Date().toISOString()
  run.metadata.rescoredWith = sha256File(join(ROOT, "eval", "scorer", "index.mjs"))
  writeRunArtifacts(dirname(absolute), run)
  console.log(`Replay sin inferencia: ${dirname(absolute)}`)
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }

  if (args.help) {
    console.log(helpText())
    return
  }

  if (args.selfCheck) {
    const status = spawnSync(
      process.execPath,
      [
        "--test",
        join(ROOT, "eval", "scorer.test.mjs"),
        join(ROOT, "eval", "fixtures.test.mjs"),
      ],
      { stdio: "inherit", cwd: ROOT },
    )
    process.exit(status.status ?? 1)
  }

  if (args.replay) {
    await replay(args.replay)
    return
  }

  if (args.compare) {
    await compareMode(args.compare, args.outputRoot)
    return
  }

  const startedAt = new Date().toISOString()
  const stage = args.stage
  const sttMode = stage !== "off"
  const layer = stage === "off" ? "A-skip-stt" : stage === "sttOnly" ? "B-with-stt" : "C-e2e"
  const suffix = stage === "off" ? "skip-stt" : stage === "sttOnly" ? "with-stt" : "e2e"
  const runId = `${startedAt.replaceAll(":", "-")}-${suffix}-${args.adapter}`
  const outDir = join(args.outputRoot, runId)

  const sourceFiles = [
    "eval/scorer/index.mjs",
    "eval/scorer/stt-metrics.mjs",
    "eval/runner.mjs",
    "eval/report.mjs",
    "eval/fixtures/cases.json",
  ]

  const metadata = {
    evaluatorVersion: 1,
    stage,
    layer,
    runId,
    startedAt,
    adapter: args.adapter,
    skipStt: stage === "off",
    node: process.version,
    electron: process.versions.electron ?? null,
    sdk: null,
    hardware: {
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model ?? null,
    },
    models: { structuring: null, stt: null },
    gitCommit: gitCommit(),
    datasetHash: datasetHash(),
    sourceHashes: Object.fromEntries(
      sourceFiles
        .filter((rel) => existsSync(join(ROOT, rel)))
        .map((rel) => [rel, sha256File(join(ROOT, rel))]),
    ),
    evidence_rule: "medido | observado | inferido | no_probado",
  }

  // Filtro audio/casos antes de tocar modelos: un run STT/E2E sin WAV falla
  // rápido (sin warmup de GPU) con un reporte bloqueado.
  const fixtures = loadManifest(args.cases)
  metadata.datasetCases = fixtures.length
  const e2e = stage === "e2e"
  const audioCases = sttMode ? fixtures.filter((f) => f.audioRef) : fixtures
  if (sttMode && audioCases.length === 0) {
    const reason = `BLOCKED — --${stage}: los casos seleccionados no tienen WAV (${fixtures.map((f) => f.id).join(", ")}). E2E/STT requieren audio; usar --skip-stt para estructuración sobre texto.`
    const run = {
      metadata,
      warmup: null,
      results: [],
      summary: summarize([]),
      error: reason,
    }
    run.summary.skippedNoAudio = fixtures.length
    writeRunArtifacts(outDir, run)
    console.error(reason)
    console.error(`Reporte bloqueado escrito en ${outDir}`)
    process.exitCode = 1
    return
  }
  const skippedNoAudio = fixtures.length - audioCases.length
  const work = sttMode ? audioCases : fixtures

  let adapter
  try {
    adapter = await createAdapter(args.adapter)
    if (sttMode && typeof adapter.transcribe !== "function") {
      throw new Error(`adapter ${args.adapter} no expone transcribe(); --${stage} requiere adapter qvac.`)
    }
    metadata.models.structuring = adapter.structuringLabel
    metadata.models.stt = sttMode ? adapter.transcribingLabel ?? null : null

    // Fase 4: prompt/schema versioning para reproducibilidad
    const promptTemplate = adapter.getPromptTemplate?.() ?? ""
    const schemaObj = adapter.getSchema?.() ?? {}
    metadata.promptHash = promptTemplate ? createHash("sha256").update(promptTemplate).digest("hex").slice(0, 12) : null
    metadata.schemaHash = Object.keys(schemaObj).length ? createHash("sha256").update(JSON.stringify(schemaObj)).digest("hex").slice(0, 12) : null

    if (args.adapter === "qvac") {
      try {
        metadata.sdk = readJson(
          join(DESKTOP, "node_modules", "@qvac", "sdk", "package.json"),
        ).version
      } catch {
        metadata.sdk = "unknown"
      }
    }
  } catch (error) {
    const reason = `BLOCKED — NEEDS TARGET HARDWARE / adapter: ${
      error instanceof Error ? error.message : String(error)
    }`
    const run = {
      metadata,
      warmup: null,
      results: [],
      summary: summarize([]),
      error: reason,
    }
    writeRunArtifacts(outDir, run)
    console.error(reason)
    console.error(`Reporte bloqueado escrito en ${outDir}`)
    process.exitCode = 1
    return
  }

  const run = {
    metadata,
    warmup: null,
    results: [],
    summary: null,
    error: null,
    skippedNoAudio,
  }
  mkdirSync(outDir, { recursive: true })

  // Helper: ejecuta una iteración completa (un pass por todos los casos)
    async function runIteration(iteration, isFirstIteration) {
      const iterResults = []
      let iterWarmup = null

      if (isFirstIteration) {
        console.log(`Warmup (${args.adapter}${sttMode ? `, modo ${stage}` : ""})…`)
        const warmStart = performance.now()
        try {
          if (e2e) {
            if (typeof adapter.warmTranscribe === "function") await adapter.warmTranscribe()
            if (typeof adapter.warm === "function") await adapter.warm()
          } else if (sttMode) {
            if (typeof adapter.warmTranscribe === "function") await adapter.warmTranscribe()
          } else {
            await adapter.warm()
          }
          iterWarmup = { ok: true, ms: performance.now() - warmStart }
        } catch (error) {
          const errMsg = inspect(error, { depth: 6, colors: false, getters: true, compact: false })
          iterWarmup = {
            ok: false,
            ms: performance.now() - warmStart,
            error: errMsg,
            stack: error instanceof Error ? error.stack : undefined,
          }
          throw new Error(`Warmup falló: ${errMsg}`)
        }
      }

      for (const fixture of work) {
        const t0 = performance.now()
        let note = null
        let error = null
        let rawSdkText = null
        let rawCompletion = null
        let sttResult = null
        let transcribeMs = null
        let transcribeAttempts = null
        let structureMs = null
        let baselinePresence = null
        let baselinePresencePairs = []
        let baselineLatencyMs = null
        let transcriptForEval = fixture.transcript
        try {
          if (sttMode) {
            // --- STT real sobre WAV (B) o primero de la cadena (C) ---
            // Retry/backoff para manejar MODEL_LOAD_PENDING tras handoff Qwen→Whisper
            let hyp = null
            let transcribeAttempt = 0
            const maxAttempts = 3
            const baseDelay = 2000
            while (true) {
              try {
                hyp = await adapter.transcribe(fixture.audioRef)
                break
              } catch (e) {
                const msg = e?.message ?? String(e)
                const isModelLoadPending = msg.includes("MODEL_LOAD_PENDING")
                transcribeAttempt++
                if (!isModelLoadPending || transcribeAttempt >= maxAttempts) throw e
                const delay = baseDelay * Math.pow(2, transcribeAttempt - 1) + Math.random() * 500
                console.log(`  [retry] ${fixture.id} transcribe MODEL_LOAD_PENDING (attempt ${transcribeAttempt}/${maxAttempts}), waiting ${Math.round(delay)}ms…`)
                await new Promise(r => setTimeout(r, delay))
              }
            }
            transcribeMs = performance.now() - t0
            transcribeAttempts = transcribeAttempt + 1 // 0 fallos → 1er intento
            sttResult = {
              reference: transcriptText(fixture.transcript),
              hypothesis: transcriptText(hyp),
              referenceSegments: fixture.transcript,
              hypothesisSegments: hyp,
            }
            if (e2e) {
              const structStart = performance.now()
              const result = await adapter.structure(hyp)
              structureMs = performance.now() - structStart
              note = result.note
              rawSdkText = result.rawSdkText ?? null
              rawCompletion = result.rawCompletion ?? null
              if (result.error) error = result.error
              transcriptForEval = hyp
              // Baseline gold-fed: mismo gold, transcripción gold (columna de
              // comparación del delta). Opcional: si falla, se excluye sin inventar.
              const baseStart = performance.now()
              try {
                const base = await adapter.structure(fixture.transcript)
                const baseLatency = performance.now() - baseStart
                const baseEval = evaluateCase({
                  gold: fixture.gold,
                  transcript: fixture.transcript,
                  note: base.note,
                  error: null,
                  latencyMs: baseLatency,
                  rawSdkText: base.rawSdkText ?? null,
                })
                baselinePresence = baseEval.presence
                baselinePresencePairs = baseEval.presencePairs
                baselineLatencyMs = baseLatency
              } catch {
                // Baseline no disponible: no se inventa ni se cuenta como error.
              }
            } else {
              // Capa B: solo STT; no se estructura.
              note = null
              rawSdkText = transcriptText(hyp)
            }
          } else {
            const result = await adapter.structure(fixture.transcript)
            note = result.note
            rawSdkText = result.rawSdkText ?? null
            rawCompletion = result.rawCompletion ?? null
            if (result.error) error = result.error
          }
        } catch (failure) {
          error =
            failure && typeof failure === "object" && "code" in failure
              ? `${failure.code}: ${failure.message}`
              : failure instanceof Error
                ? failure.message
                : String(failure)
        }
        const latencyMs = performance.now() - t0
        const evaluation = evaluateCase({
          gold: fixture.gold,
          transcript: transcriptForEval,
          note,
          error,
          latencyMs,
          rawSdkText,
        })
        const row = {
          id: fixture.id,
          category: fixture.category,
          transcript: transcriptForEval,
          gold: fixture.gold,
          note,
          error,
          latencyMs,
          rawSdkText,
          rawCompletion,
          evaluation,
          stage,
          transcribeMs,
          transcribeAttempts,
          structureMs,
          baselinePresence,
          baselinePresencePairs,
          baselineLatencyMs,
        }
        if (sttResult) row.stt = sttResult
        iterResults.push(row)
        const label = sttMode
          ? e2e
            ? `${transcribeMs === null ? "?" : transcribeMs.toFixed(1)}ms stt + ${structureMs === null ? "?" : structureMs.toFixed(1)}ms struct`
            : "STT"
          : error ?? (evaluation.invention ? "invención" : "ok")
        console.log(`Iter ${iteration} | Caso ${fixture.id}: ${latencyMs.toFixed(1)} ms; ${label}`)
      }

      // Resumir esta iteración
      const { computeSttMetrics, summarizeStt } = await import("./scorer/stt-metrics.mjs")
      const sttResults = []
      const confusions = []
      for (const r of iterResults) {
        if (!r.stt || !r.stt.reference || !r.stt.hypothesis) continue
        sttResults.push({
          id: r.id,
          category: r.category,
          metrics: computeSttMetrics({
            reference: r.stt.reference,
            hypothesis: r.stt.hypothesis,
          }),
        })
        confusions.push({ reference: r.stt.reference, hypothesis: r.stt.hypothesis })
      }
      const transcribeAttemptsMap =
        iterResults.length > 0
          ? Object.fromEntries(
              iterResults.map((r) => [r.id, typeof r.transcribeAttempts === "number" ? r.transcribeAttempts : 1]),
            )
          : null
      const sttSummary = sttResults.length
        ? summarizeStt(sttResults, { confusions, transcribeAttempts: transcribeAttemptsMap })
        : null

      const iterSummary = summarize(
        iterResults.map((r) => ({
          id: r.id,
          evaluation: r.evaluation,
          error: r.error,
          latencyMs: r.latencyMs,
        })),
      )
      iterSummary.skippedNoAudio = skippedNoAudio
      iterSummary.stt = sttSummary ?? {
        status: "no_medido",
        reason: "Sin resultados STT medidos en esta corrida.",
        evidence: "no_probado",
      }
      if (e2e) {
        const withBaseline = iterResults.filter(
          (r) => Array.isArray(r.baselinePresencePairs) && r.baselinePresencePairs.length > 0,
        )
        iterSummary.baselinePresence = presenceMetrics(
          withBaseline.flatMap((r) => r.baselinePresencePairs),
        )
        iterSummary.structureLatency = latencyStats(
          iterResults.map((r) => r.structureMs).filter((n) => Number.isFinite(n)),
        )
      }
      // sttLatency + coldHot para esta iteración
      const iterSttLatency = latencyStats(
        iterResults.map((r) => r.transcribeMs).filter((n) => Number.isFinite(n)),
      )
      const iterColdHot = coldHotMetrics(
        iterWarmup?.ok ? iterWarmup.ms : null,
        iterResults.map((r) => r.latencyMs),
      )

      return {
        iteration,
        warmup: iterWarmup,
        results: iterResults,
        summary: {
          ...iterSummary,
          sttLatency: iterSttLatency,
          coldHot: iterColdHot,
        },
      }
    }

    // --- Main: ejecutar N repeticiones ---
    const repetitions = []
    for (let i = 1; i <= args.repeats; i++) {
      console.log(`\n=== Iteración ${i}/${args.repeats} ===`)
      const iter = await runIteration(i, i === 1)
      repetitions.push(iter)
      // Acumular en run.results para backward compat (última iteración)
      run.results = iter.results
      run.warmup = iter.warmup
    }

    // Summary final = última iteración (para compat con report.mjs actual)
    const lastIter = repetitions[repetitions.length - 1]
    run.summary = lastIter.summary
    run.summary.skippedNoAudio = skippedNoAudio
    run.repetitions = repetitions

    // Fase 4: compute repeatability a partir de todas las iteraciones
    const metricExtractors = {
      presenceAccuracy: (s) => s.presence?.accuracy ?? NaN,
      latencyP50: (s) => s.latency?.p50 ?? NaN,
      sttWer: (s) => s.stt?.meanWer ?? NaN,
      structureLatencyP50: (s) => s.structureLatency?.p50 ?? NaN,
      coldHotSteadyP50: (s) => s.coldHot?.steadyP50 ?? NaN,
    }
    run.summary.repeatability = computeRepeatability(
      repetitions.map((r) => ({ summary: r.summary })),
      metricExtractors,
    )

    writeRunArtifacts(outDir, run)
    appendHistory(HISTORY, historyEntry(metadata, run.summary))
  console.log(
    JSON.stringify(
      {
        runId,
        cases: run.summary.cases,
        errors: run.summary.errors,
        presenceAccuracy: run.summary.presence.accuracy,
        inventionRate: run.summary.invention.rate,
        latencyP50: run.summary.latency.p50,
        structureLatencyP50: run.summary.structureLatency?.p50 ?? null,
        baselinePresenceAccuracy: run.summary.baselinePresence?.accuracy ?? null,
        stt: run.summary.stt.status,
        sttSummary: run.summary.stt.status === "medido" ? {
          cases: run.summary.stt.cases,
          meanWer: run.summary.stt.meanWer,
          meanCer: run.summary.stt.meanCer,
          werPerCase: run.summary.stt.werPerCase,
          werPerCategory: run.summary.stt.werPerCategory,
          topConfusions: run.summary.stt.topConfusions,
          negationDrops: run.summary.stt.negationDrops,
          negationAdds: run.summary.stt.negationAdds,
          transcribeRetryRate: run.summary.stt.transcribeRetryRate ?? null,
          transcribeFirstTryRate: run.summary.stt.transcribeFirstTryRate ?? null,
          transcribeRetries: run.summary.stt.transcribeRetries ?? null,
          evidence: run.summary.stt.evidence,
        } : null,
      },
      null,
      2,
    ),
  )
  console.log(`Reportes: ${outDir}`)
  if (run.summary.errors) process.exitCode = 1
}

await main()
