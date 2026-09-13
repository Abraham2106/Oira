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
import { evaluateCase, latencyStats, presenceMetrics, summarize } from "./scorer/index.mjs"
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

function helpText() {
  return `Uso: pnpm eval [flags]

Evaluación Oira por capas (default: --e2e). Etiquetas: medido | observado | inferido | no_probado.

Stages (mutuamente excluyentes):
  --e2e            (default) Capa C: audio → STT → estructuración sobre la hipótesis de
                   Whisper → presencia I4 vs gold + delta gold-fed→STT-fed. Solo casos con WAV.
  --skip-stt       Capa A: estructuración sobre transcripción gold. Todos los casos.
  --with-stt       Capa B: solo STT (WER/CER), sin estructuración. Solo casos con WAV.

Otros flags:
  --replay <run.json>  Re-render + re-score determinístico (nunca re-inferencia).
  --cases "01,05,02"   Subconjunto de casos del manifest.
  --adapter qvac|heuristic  Adapter de modelos (default qvac; qvac requiere GPU/Whisper local).
  --output-dir <dir>   Directorio de salida (default reports/).
  --self-check         Tests sin modelos.
  --help               Muestra esta ayuda.

Ejemplos:
  pnpm eval                      # Capa C (e2e, default)
  pnpm eval -- --skip-stt        # Capa A
  pnpm eval -- --with-stt        # Capa B
  pnpm eval -- --replay reports/<run-id>/run.json
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
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--self-check") args.selfCheck = true
    else if (a === "--skip-stt") args.stage = "off"
    else if (a === "--with-stt") args.stage = "sttOnly"
    else if (a === "--e2e") args.stage = "e2e"
    else if (a === "--replay") args.replay = argv[++i]
    else if (a === "--cases") {
      args.cases = argv[++i].split(",").map((s) => s.trim()).filter(Boolean)
    } else if (a === "--adapter") args.adapter = argv[++i]
    else if (a === "--output-dir") args.outputRoot = resolve(ROOT, argv[++i])
    else if (a === "--help") args.help = true
  }
  if (!args.help) {
    const explicit = new Set(argv)
    if (explicit.has("--e2e") && (explicit.has("--with-stt") || explicit.has("--skip-stt"))) {
      throw new Error("--e2e es mutuamente excluyente con --with-stt y --skip-stt.")
    }
    if (explicit.has("--with-stt") && explicit.has("--skip-stt")) {
      throw new Error("--with-stt y --skip-stt son mutuamente excluyentes.")
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
    }
  }

  if (name !== "qvac") throw new Error(`Adapter no soportado: ${name}`)
  ensureQvacElectronRuntime()

  const { createQvacInferenceRuntime } = await importDesktopTs(
    "main/qvac/inference-runtime.ts",
  )
  const { createQwenStructuring } = await importDesktopTs("main/qvac/qwen-structuring.ts")
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
      return { note: result.note, rawSdkText, rawCompletion: lastRaw }
    },
    async close() {
      await runtime.shutdown()
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

  try {
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
      run.warmup = { ok: true, ms: performance.now() - warmStart }
    } catch (error) {
      const errMsg = inspect(error, { depth: 6, colors: false, getters: true, compact: false })
      run.warmup = {
        ok: false,
        ms: performance.now() - warmStart,
        error: errMsg,
        stack: error instanceof Error ? error.stack : undefined,
      }
      throw new Error(`Warmup falló: ${errMsg}`)
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
      run.results.push(row)
      writeJson(join(outDir, "run.json"), run)
      const label = sttMode
        ? e2e
          ? `${transcribeMs === null ? "?" : transcribeMs.toFixed(1)}ms stt + ${structureMs === null ? "?" : structureMs.toFixed(1)}ms struct`
          : "STT"
        : error ?? (evaluation.invention ? "invención" : "ok")
      console.log(`Caso ${fixture.id}: ${latencyMs.toFixed(1)} ms; ${label}`)
    }

    const { computeSttMetrics, summarizeStt } = await import("./scorer/stt-metrics.mjs")
    const sttResults = []
    const confusions = []
    for (const r of run.results) {
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
      run.results.length > 0
        ? Object.fromEntries(
            run.results.map((r) => [r.id, typeof r.transcribeAttempts === "number" ? r.transcribeAttempts : 1]),
          )
        : null
    const sttSummary = sttResults.length
      ? summarizeStt(sttResults, { confusions, transcribeAttempts: transcribeAttemptsMap })
      : null

    run.summary = summarize(
      run.results.map((r) => ({
        id: r.id,
        evaluation: r.evaluation,
        error: r.error,
        latencyMs: r.latencyMs,
      })),
    )
    run.summary.skippedNoAudio = skippedNoAudio
    run.summary.stt = sttSummary ?? {
      status: "no_medido",
      reason: "Sin resultados STT medidos en esta corrida.",
      evidence: "no_probado",
    }
    if (e2e) {
      const withBaseline = run.results.filter(
        (r) => Array.isArray(r.baselinePresencePairs) && r.baselinePresencePairs.length > 0,
      )
      run.summary.baselinePresence = presenceMetrics(
        withBaseline.flatMap((r) => r.baselinePresencePairs),
      )
      run.summary.structureLatency = latencyStats(
        run.results.map((r) => r.structureMs).filter((n) => Number.isFinite(n)),
      )
    }
  } catch (error) {
    run.error = error instanceof Error ? error.message : String(error)
    run.summary = summarize(
      run.results.map((r) => ({
        id: r.id,
        evaluation: r.evaluation,
        error: r.error,
        latencyMs: r.latencyMs,
      })),
    )
    run.summary.skippedNoAudio = skippedNoAudio
    writeRunArtifacts(outDir, run)
    console.error(run.error)
    process.exitCode = 1
    return
  } finally {
    try {
      await adapter.close()
    } catch {
      // ignore
    }
  }

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
