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
import { evaluateCase, summarize } from "./scorer/index.mjs"
import { summarizeStt } from "./scorer/stt-metrics.mjs"
import { buildArtifacts } from "./report.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DESKTOP = join(ROOT, "apps", "desktop")
const FIXTURES = join(ROOT, "eval", "fixtures")
const AUDIO = join(ROOT, "eval", "audio")
const require = createRequire(join(DESKTOP, "package.json"))
const SELF = fileURLToPath(import.meta.url)

function parseArgs(argv) {
  const args = {
    skipStt: true,
    selfCheck: false,
    replay: null,
    cases: null,
    adapter: "qvac",
    outputRoot: join(ROOT, "reports"),
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--self-check") args.selfCheck = true
    else if (a === "--skip-stt") args.skipStt = true
    else if (a === "--with-stt") args.skipStt = false
    else if (a === "--replay") args.replay = argv[++i]
    else if (a === "--cases") {
      args.cases = argv[++i].split(",").map((s) => s.trim()).filter(Boolean)
    } else if (a === "--adapter") args.adapter = argv[++i]
    else if (a === "--output-dir") args.outputRoot = resolve(ROOT, argv[++i])
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
  const isSttRun = run.metadata?.skipStt === false
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
  if (isSttRun) {
    const { computeSttMetrics, summarizeStt } = await import("./scorer/stt-metrics.mjs")
    const sttResults = run.results
      .filter((r) => r.stt && r.stt.reference && r.stt.hypothesis)
      .map((r) => ({
        id: r.id,
        metrics: computeSttMetrics({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        }),
      }))
    run.summary.stt = sttResults.length ? summarizeStt(sttResults) : run.summary.stt
  }
  run.metadata.rescoredAt = new Date().toISOString()
  run.metadata.rescoredWith = sha256File(join(ROOT, "eval", "scorer", "index.mjs"))
  writeRunArtifacts(dirname(absolute), run)
  console.log(`Replay sin inferencia: ${dirname(absolute)}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

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
  const sttMode = !args.skipStt
  const runId = `${startedAt.replaceAll(":", "-")}-${sttMode ? "with-stt" : "skip-stt"}-${args.adapter}`
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
    layer: "A-skip-stt",
    runId,
    startedAt,
    adapter: args.adapter,
    skipStt: args.skipStt,
    layer: sttMode ? "B-with-stt" : "A-skip-stt",
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

  let adapter
  try {
    adapter = await createAdapter(args.adapter)
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

  const fixtures = loadManifest(args.cases)
  const run = { metadata, warmup: null, results: [], summary: null, error: null }
  mkdirSync(outDir, { recursive: true })

  try {
    console.log(`Warmup (${args.adapter}${sttMode ? ", modo STT" : ""})…`)
    const warmStart = performance.now()
    try {
      if (sttMode && typeof adapter.warmTranscribe === "function") {
        await adapter.warmTranscribe()
      } else {
        await adapter.warm()
      }
      run.warmup = { ok: true, ms: performance.now() - warmStart }
    } catch (error) {
      run.warmup = {
        ok: false,
        ms: performance.now() - warmStart,
        error: error instanceof Error ? error.message : String(error),
      }
      throw new Error(`Warmup falló: ${run.warmup.error}`)
    }

    for (const fixture of fixtures) {
      const start = performance.now()
      let note = null
      let error = null
      let rawSdkText = null
      let rawCompletion = null
      let sttResult = null
      try {
        if (sttMode && fixture.audioRef) {
          // --- Nivel 1: STT real sobre WAV ---
          const transcriptSegments = await adapter.transcribe(fixture.audioRef)
          const hypothesisText = transcriptSegments
            .map((s) => s.text)
            .join(" ")
          const referenceText = fixture.transcript
            .map((s) => s.text)
            .join(" ")
          sttResult = {
            reference: referenceText,
            hypothesis: hypothesisText,
            referenceSegments: fixture.transcript,
            hypothesisSegments: transcriptSegments,
          }
          // Para Capa B, el "note" se deriva del transcript STT (gold) —
          // estructuración se salta; evaluamos WER/CER sobre la transcripción.
          note = null
          rawSdkText = hypothesisText
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
      const latencyMs = performance.now() - start
      let evaluation
      if (sttMode && !error) {
        evaluation = evaluateCase({
          gold: fixture.gold,
          transcript: fixture.transcript,
          note: null,
          error: null,
          latencyMs,
          rawSdkText,
        })
        run.results.push({
          id: fixture.id,
          category: fixture.category,
          transcript: fixture.transcript,
          gold: fixture.gold,
          note: null,
          error: null,
          latencyMs,
          rawSdkText,
          rawCompletion: null,
          evaluation,
          stt: sttResult,
        })
      } else {
        evaluation = evaluateCase({
          gold: fixture.gold,
          transcript: fixture.transcript,
          note,
          error,
          latencyMs,
          rawSdkText,
        })
        run.results.push({
          id: fixture.id,
          category: fixture.category,
          transcript: fixture.transcript,
          gold: fixture.gold,
          note,
          error,
          latencyMs,
          rawSdkText,
          rawCompletion,
          evaluation,
        })
      }
      writeJson(join(outDir, "run.json"), run)
      const label = sttMode ? "STT" : (error ?? (evaluation.invention ? "invención" : "ok"))
      console.log(
        `Caso ${fixture.id}: ${latencyMs.toFixed(1)} ms; ${label}`,
      )
    }

    const { computeSttMetrics, summarizeStt } = await import("./scorer/stt-metrics.mjs")
    const sttResults = []
    for (const r of run.results) {
      if (!r.stt || !r.stt.reference || !r.stt.hypothesis) continue
      sttResults.push({
        id: r.id,
        metrics: computeSttMetrics({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        }),
      })
    }
    const sttSummary = sttResults.length ? summarizeStt(sttResults) : null

    run.summary = summarize(
      run.results.map((r) => ({
        id: r.id,
        evaluation: r.evaluation,
        error: r.error,
        latencyMs: r.latencyMs,
      })),
    )
    run.summary.stt = sttSummary ?? {
      status: "no_medido",
      reason: "Sin resultados STT medidos en esta corrida.",
      evidence: "no_probado",
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
  console.log(
    JSON.stringify(
      {
        runId,
        cases: run.summary.cases,
        errors: run.summary.errors,
        presenceAccuracy: run.summary.presence.accuracy,
        inventionRate: run.summary.invention.rate,
        latencyP50: run.summary.latency.p50,
        stt: run.summary.stt.status,
        sttSummary: run.summary.stt.status === "medido" ? {
          cases: run.summary.stt.cases,
          meanWer: run.summary.stt.meanWer,
          meanCer: run.summary.stt.meanCer,
          werPerCase: run.summary.stt.werPerCase,
          negationDrops: run.summary.stt.negationDrops,
          negationAdds: run.summary.stt.negationAdds,
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
