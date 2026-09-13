import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  PRESENCE_LABELS,
  SECTION_IDS,
  alignTokens,
  charErrorRate,
  coldHotMetrics,
  evaluateCase,
  extractConfusions,
  latencyStats,
  normalizeText,
  presenceMetrics,
  quantile,
  ratio,
  sttNotMeasured,
  summarize,
  wordErrorRate,
} from "./scorer/index.mjs"
import {
  computeSttMetrics,
  negationDeltas,
  summarizeStt,
  transcriptText,
} from "./scorer/stt-metrics.mjs"
import {
  scoreMustNotInclude,
  scoreQuoteCoverage,
  scoreSourceSupport,
} from "./scorer/extraction-fidelity.mjs"
import { buildArtifacts, renderReport } from "./report.mjs"

const emptyNote = () => ({
  sections: Object.fromEntries(
    SECTION_IDS.map((id) => [
      id,
      { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
    ]),
  ),
})

describe("ratio", () => {
  it("returns null when the denominator is empty", () => {
    assert.equal(ratio(0, 0), null)
    assert.equal(ratio(3, 0), null)
  })

  it("does not invent 0% or 100% from a missing denominator", () => {
    assert.notEqual(ratio(0, 0), 0)
    assert.notEqual(ratio(0, 0), 1)
  })

  it("divides when the denominator exists", () => {
    assert.equal(ratio(1, 4), 0.25)
  })
})

describe("normalizeText", () => {
  it("folds case and Spanish accents for lexical checks", () => {
    assert.equal(normalizeText("  Fiebre  "), normalizeText("fiebre"))
    assert.equal(normalizeText("Panamá"), normalizeText("Panama"))
  })
})

describe("presenceMetrics", () => {
  it("scores a 3-class confusion matrix and per-class F1", () => {
    const pairs = [
      { gold: "STATED", pred: "STATED" },
      { gold: "STATED", pred: "NOT_STATED" },
      { gold: "NOT_STATED", pred: "NOT_STATED" },
      { gold: "UNKNOWN", pred: "STATED" },
    ]
    const metrics = presenceMetrics(pairs)
    assert.deepEqual(PRESENCE_LABELS, ["STATED", "NOT_STATED", "UNKNOWN"])
    assert.equal(metrics.n, 4)
    assert.equal(metrics.accuracy, 0.5)
    assert.equal(metrics.confusion.STATED.STATED, 1)
    assert.equal(metrics.confusion.STATED.NOT_STATED, 1)
    assert.equal(metrics.confusion.UNKNOWN.STATED, 1)
    assert.ok(metrics.perClass.STATED.precision !== null)
    assert.ok(metrics.macroF1 !== null)
  })

  it("returns null F1 for a class that never appears in gold or predictions", () => {
    const pairs = [
      { gold: "STATED", pred: "STATED" },
      { gold: "NOT_STATED", pred: "NOT_STATED" },
    ]
    const metrics = presenceMetrics(pairs)
    assert.equal(metrics.perClass.UNKNOWN.f1, null)
    assert.equal(metrics.perClass.UNKNOWN.support, 0)
  })

  it("scores F1 as 0 when a gold class is never predicted", () => {
    const metrics = presenceMetrics([
      { gold: "UNKNOWN", pred: "STATED" },
      { gold: "UNKNOWN", pred: "NOT_STATED" },
      { gold: "STATED", pred: "STATED" },
    ])
    assert.equal(metrics.perClass.UNKNOWN.support, 2)
    assert.equal(metrics.perClass.UNKNOWN.precision, 0)
    assert.equal(metrics.perClass.UNKNOWN.recall, 0)
    assert.equal(metrics.perClass.UNKNOWN.f1, 0)
  })
})

describe("evaluateCase", () => {
  it("does not score a failed run as a success", () => {
    const gold = {
      must_not_contain: ["faringitis"],
      sections: {
        visit_context: { presence: "STATED", mustInclude: ["rodilla"] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [] },
      },
    }
    const result = evaluateCase({
      gold,
      note: emptyNote(),
      transcript: [{ id: "seg-1", text: "rodilla", startMs: 0 }],
      error: "MODEL_NOT_READY",
      rawSdkText: "{",
      latencyMs: 12,
    })
    assert.equal(result.productEmitted, false)
    assert.equal(result.presencePairs.length, 0)
    assert.equal(result.invention, false)
    assert.equal(result.latencyMs, null)
  })

  it("flags must_not_contain hits and STATED fields without sources", () => {
    const note = emptyNote()
    note.sections.visit_context = {
      text: "Sospecha de faringitis por dolor de rodilla.",
      presence: "STATED",
      sourceSegmentIds: [],
      reviewed: false,
    }
    const gold = {
      must_not_contain: ["faringitis"],
      sections: {
        visit_context: { presence: "STATED", mustInclude: ["rodilla"] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [] },
      },
    }
    const result = evaluateCase({
      gold,
      note,
      transcript: [{ id: "seg-1", text: "dolor de rodilla", startMs: 0 }],
      rawSdkText: '{"visit_context":"dolor"}',
    })
    assert.equal(result.productEmitted, true)
    assert.equal(result.rawJsonValid, true)
    assert.equal(result.invention, true)
    assert.deepEqual(result.mustNotContainHits, ["faringitis"])
    assert.deepEqual(result.statedWithoutSource, ["visit_context"])
    assert.equal(result.verifySourceOk, true)
    assert.equal(result.mustInclude.visit_context.found, 1)
  })

  it("fails verifySource when a cited id is missing", () => {
    const note = emptyNote()
    note.sections.visit_context = {
      text: "Dolor de rodilla.",
      presence: "STATED",
      sourceSegmentIds: ["seg-99"],
      reviewed: false,
    }
    const gold = {
      must_not_contain: [],
      sections: Object.fromEntries(
        SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [] }]),
      ),
    }
    gold.sections.visit_context = { presence: "STATED", mustInclude: [] }
    const result = evaluateCase({
      gold,
      note,
      transcript: [{ id: "seg-1", text: "Dolor de rodilla.", startMs: 0 }],
    })
    assert.equal(result.verifySourceOk, false)
  })
})

describe("quantile", () => {
  it("returns null for an empty sample", () => {
    assert.equal(quantile([], 0.5), null)
  })

  it("interpolates p50 between the two central values when n is even", () => {
    assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5)
  })
})

describe("latencyStats", () => {
  it("exports the same shape summarize uses, empty-safe", () => {
    const s = latencyStats([])
    assert.equal(s.samples, 0)
    assert.equal(s.p50, null)
    assert.equal(s.mean, null)
  })

  it("computes percentiles over the given finite samples", () => {
    const s = latencyStats([10, 20, 30])
    assert.equal(s.samples, 3)
    assert.equal(s.p50, 20)
    assert.equal(s.min, 10)
    assert.equal(s.max, 30)
  })
})

describe("summarize", () => {
  it("keeps failed cases in the denominator and excludes them from latency", () => {
    const gold = {
      must_not_contain: [],
      sections: Object.fromEntries(
        SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [] }]),
      ),
    }
    const ok = evaluateCase({
      gold,
      note: emptyNote(),
      transcript: [],
      latencyMs: 10,
    })
    const failed = evaluateCase({
      gold,
      note: emptyNote(),
      transcript: [],
      error: "timeout",
      latencyMs: 9999,
    })
    const summary = summarize([
      { id: "01", evaluation: ok, error: null, latencyMs: 10 },
      { id: "02", evaluation: failed, error: "timeout", latencyMs: 9999 },
    ])
    assert.equal(summary.cases, 2)
    assert.equal(summary.errors, 1)
    assert.equal(summary.latency.samples, 1)
    assert.equal(summary.latency.p50, 10)
    assert.equal(summary.stt.status, "no_medido")
  })
})

describe("stt stubs", () => {
  it("computes WER and CER on strings without claiming a benchmark run", () => {
    assert.equal(wordErrorRate("hola mundo", "hola mundo"), 0)
    assert.ok(wordErrorRate("hola mundo", "hola") > 0)
    assert.equal(charErrorRate("ab", "ab"), 0)
    assert.ok(charErrorRate("ab", "ac") > 0)
  })

  it("exposes an explicit not-measured STT payload", () => {
    const payload = sttNotMeasured("skip-stt: no hay WAV en esta etapa")
    assert.equal(payload.status, "no_medido")
    assert.equal(payload.wer, null)
    assert.equal(payload.cer, null)
    assert.equal(payload.evidence, "no_probado")
  })
})

describe("transcriptText (STT nivel 1)", () => {
  it("joins segment arrays and tolerates empty lists", () => {
    assert.equal(transcriptText([]), "")
    assert.equal(
      transcriptText([
        { text: "Dolor de rodilla", startMs: 0 },
        { text: "", startMs: 5 },
        { text: "izquierda", startMs: 9 },
      ]),
      "Dolor de rodilla izquierda",
    )
  })

  it("optionally prepends timestamps", () => {
    assert.equal(
      transcriptText([{ text: "hola", startMs: 120 }], {
        preserveTimestamps: true,
      }),
      "[120] hola",
    )
  })
})

describe("negationDeltas (STT nivel 1)", () => {
  it("counts dropped 'no' words reference→hypothesis", () => {
    const d = negationDeltas("No hay fiebre", "hay fiebre")
    assert.equal(d.dropped, 1)
    assert.equal(d.added, 0)
  })

  it("counts added 'no' words reference→hypothesis", () => {
    const d = negationDeltas("hay fiebre", "No hay fiebre")
    assert.equal(d.added, 1)
    assert.equal(d.dropped, 0)
  })

  it("is case- and accent-insensitive", () => {
    const d = negationDeltas("No hay tos", "no hay tos")
    assert.deepEqual(d, { dropped: 0, added: 0 })
  })
})

describe("computeSttMetrics (STT nivel 1)", () => {
  it("measures WER/CER on equal text as zero", () => {
    const m = computeSttMetrics({
      referenceText: "Dolor de rodilla izquierda",
      hypothesisText: "Dolor de rodilla izquierda",
    })
    assert.equal(m.status, "medido")
    assert.equal(m.wer, 0)
    assert.equal(m.cer, 0)
    assert.equal(m.transcribeSuccess, true)
    assert.equal(m.evidence, "medido")
  })

  it("reports an empty hypothesis as a failed transcription", () => {
    const m = computeSttMetrics({
      referenceText: "Dolor de rodilla",
      hypothesisText: "",
    })
    assert.equal(m.emptyTranscript, true)
    assert.equal(m.transcribeSuccess, false)
    assert.equal(m.hypTokens, 0)
  })

  it("accepts segment arrays as well as plain strings", () => {
    const m = computeSttMetrics({
      reference: [{ text: "uno", startMs: 0 }],
      hypothesis: [{ text: "dos", startMs: 0 }],
    })
    assert.equal(m.refTokens, 1)
    assert.equal(m.hypTokens, 1)
    assert.ok(m.wer > 0)
  })
})

describe("summarizeStt (STT nivel 1)", () => {
  it("flags no measured rows instead of inventing a number", () => {
    const s = summarizeStt([])
    assert.equal(s.status, "no_medido")
    assert.equal(s.evidence, "no_probado")
    assert.ok(s.reason)
  })

  it("aggregates WER/CER means and per-case WER", () => {
    const s = summarizeStt([
      { id: "01", metrics: computeSttMetrics({ referenceText: "a b", hypothesisText: "a b" }) },
      { id: "02", metrics: computeSttMetrics({ referenceText: "a b c", hypothesisText: "a" }) },
    ])
    assert.equal(s.status, "medido")
    assert.equal(s.transcribeSuccessRate, 1)
    assert.equal(s.werPerCase["01"], 0)
    assert.ok(s.meanWer > 0)
    assert.equal(s.evidence, "medido")
  })
})

describe("Capa B report artifact (--with-stt)", () => {
  const gold = {
    must_not_contain: [],
    sections: Object.fromEntries(
      SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [] }]),
    ),
  }
  const mkRun = () => {
    const evaluation = evaluateCase({
      gold,
      transcript: [],
      note: null,
      error: null,
      latencyMs: 10,
      rawSdkText: "Dolor de rodilla izquierda",
    })
    const results = [
      {
        id: "01-simple",
        category: "simple",
        transcript: [],
        gold,
        note: null,
        error: null,
        latencyMs: 10,
        rawSdkText: "Dolor de rodilla izquierda",
        rawCompletion: null,
        evaluation,
        stt: {
          reference: "Dolor de rodilla izquierda",
          hypothesis: "Dolor de rodilla izquierda",
        },
      },
    ]
    const summary = summarize(
      results.map((r) => ({
        id: r.id,
        evaluation: r.evaluation,
        error: r.error,
        latencyMs: r.latencyMs,
      })),
    )
    summary.stt = summarizeStt(
      results.map((r) => ({
        id: r.id,
        metrics: computeSttMetrics({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        }),
      })),
    )
    return {
      metadata: {
        evaluatorVersion: 1,
        layer: "B-with-stt",
        runId: "test-B",
        startedAt: "2026-09-13T00:00:00.000Z",
        adapter: "qvac",
        skipStt: false,
        node: "v24",
        electron: null,
        sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { structuring: null, stt: "WHISPER_QVAC_LOCAL" },
        gitCommit: null,
        datasetHash: "abc",
        sourceHashes: {},
        evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results,
    }
  }

  it("aggregates a measured STT summary with WER 0 on identical gold", () => {
    const run = mkRun()
    assert.equal(run.summary.stt.status, "medido")
    assert.equal(run.summary.stt.werPerCase["01-simple"], 0)
    assert.equal(run.summary.stt.meanWer, 0)
  })

  it("renders WER/CER followed by reproduce report", () => {
    const run = mkRun()
    const md = renderReport(run)
    assert.match(md, /WER \| 0\.0%/)
    assert.match(md, /Transcribe success \| 100\.0% \(1\/1\)/)
    assert.match(md, /Presence accuracy \(I4\) \| no_probado/)
    assert.match(md, /Cómo reproducir este reporte/)
    assert.match(md, /pnpm eval -- --with-stt/)
  })

  it("keeps the evidence rule in the compact render", () => {
    const run = mkRun()
    const md = renderReport(run)
    assert.match(md, /\*\*No probado\.\*/)
    assert.match(md, /\*\*No probado\.\*\* Capa B no ejecuta estructuración/)
  })

  it("builds artifacts JSON without inventing presence", () => {
    const run = mkRun()
    const { metrics, cases, errors } = buildArtifacts(run)
    assert.equal(metrics.stt.status, "medido")
    assert.equal(metrics.presence.accuracy, null)
    assert.equal(metrics.layer, "B-with-stt")
    assert.equal(errors.length, 0)
    assert.equal(cases.length, 1)
  })
})

describe("Capa C report artifact (--e2e)", () => {
  const gold = {
    must_not_contain: ["faringitis"],
    sections: Object.fromEntries(
      SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [] }]),
    ),
  }
  gold.sections.visit_context = { presence: "STATED", mustInclude: [] }

  const hypSegments = (id) => [
    { id: `seg-1-${id}`, text: "Dolor de rodilla izquierda", startMs: 0 },
  ]
  const e2eNote = (id) => {
    const note = emptyNote()
    note.sections.visit_context = {
      text: "Dolor de rodilla izquierda.",
      presence: "STATED",
      sourceSegmentIds: [`seg-1-${id}`],
      reviewed: false,
    }
    return note
  }

  const mkRun = () => {
    const rows = ["01-simple", "02-negation"].map((id) => {
      const hyp = hypSegments(id)
      const evStt = evaluateCase({
        gold,
        transcript: hyp,
        note: e2eNote(id),
        error: null,
        latencyMs: 250,
        rawSdkText: '{"visit_context":"Dolor de rodilla izquierda"}',
      })
      const evGold = evaluateCase({
        gold,
        transcript: goldSegments(),
        note: e2eNote(id),
        error: null,
        latencyMs: 190,
        rawSdkText: '{"visit_context":"Dolor de rodilla izquierda"}',
      })
      return {
        id,
        category: id === "01-simple" ? "simple" : "negation",
        transcript: hyp,
        gold,
        note: e2eNote(id),
        error: null,
        latencyMs: evStt.latencyMs,
        rawSdkText: evStt.rawSdkText,
        rawCompletion: null,
        evaluation: evStt,
        stage: "e2e",
        transcribeMs: 60,
        structureMs: 190,
        baselinePresence: evGold.presence,
        baselinePresencePairs: evGold.presencePairs,
        baselineLatencyMs: 190,
        stt: {
          reference: "Dolor de rodilla izquierda",
          hypothesis:
            id === "02-negation"
              ? "Dolor de rodilla derecha"
              : "Dolor de rodilla izquierda",
        },
      }
    })
    const summary = summarize(
      rows.map((r) => ({
        id: r.id,
        evaluation: r.evaluation,
        error: r.error,
        latencyMs: r.latencyMs,
      })),
    )
    summary.skippedNoAudio = 11 // 13 manifest - 2 audio en este sintético
    summary.stt = summarizeStt(
      rows.map((r) => ({
        id: r.id,
        category: r.category,
        metrics: computeSttMetrics({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        }),
      })),
      {
        confusions: rows.map((r) => ({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        })),
      },
    )
    summary.baselinePresence = presenceMetrics(
      rows.flatMap((r) => r.baselinePresencePairs),
    )
    summary.structureLatency = latencyStats(rows.map((r) => r.structureMs))
    return {
      metadata: {
        evaluatorVersion: 1,
        stage: "e2e",
        layer: "C-e2e",
        runId: "test-C",
        startedAt: "2026-09-13T00:00:00.000Z",
        adapter: "qvac",
        skipStt: false,
        datasetCases: 13,
        node: "v24",
        electron: null,
        sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { structuring: "QWEN3_4B_Q4_K_M", stt: "WHISPER_QVAC_LOCAL" },
        gitCommit: null,
        datasetHash: "abc",
        sourceHashes: {},
        evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results: rows,
    }
  }

  const goldSegments = () => [{ id: "gold-1", text: "Dolor de rodilla izquierda", startMs: 0 }]

  it("keeps presence measured (not no_probado) alongside STT", () => {
    const run = mkRun()
    assert.equal(run.summary.stt.status, "medido")
    assert.ok(run.summary.presence.accuracy !== null)
    const md = renderReport(run)
    assert.match(md, /Presence accuracy \(I4, sobre hipótesis STT\) \| 100\.0% \(14\/14\)/)
    assert.doesNotMatch(md, /Presence accuracy \(I4\) \| no_probado/)
    assert.doesNotMatch(md, /Macro-F1 presencia \| no_probado/)
  })

  it("renders the STT denominator and both latency rows", () => {
    const md = renderReport(mkRun())
    assert.match(md, /WER\/CER sobre 2\/13 casos \(WAV\)/)
    assert.match(md, /\| Latency structure p50 \(ms\) \| 190\.0 \|/)
    assert.match(md, /\| Latency E2E p50 \(ms\) \| 250\.0 \|/)
  })

  it("renders the gold-fed → STT-fed delta table with 0.0pp", () => {
    const md = renderReport(mkRun())
    assert.match(md, /Delta presence gold-fed → STT-fed/)
    assert.match(md, /\| 01-simple \| 100\.0% \(7\/7\) \| 100\.0% \(7\/7\) \| 0\.0pp \|/)
    assert.match(md, /Agregado: macro-F1 STT-fed 1\.000 · gold-fed 1\.000/)
  })

  it("shows cases as X/13 and skipped-no-audio row", () => {
    const md = renderReport(mkRun())
    assert.match(md, /\| Casos \| 2\/13 \|/)
    assert.match(md, /\| Sin WAV \(omitidos\) \| 11 \|/)
    assert.match(md, /pnpm eval\s+# re-ejecutar Capa C --e2e \(default/)
  })

  it("renders a blocked run as no_probado without inventing numbers", () => {
    const run = mkRun()
    run.error = "BLOCKED — --e2e: los casos seleccionados no tienen WAV"
    const md = renderReport(run)
    assert.match(md, /\*\*Run bloqueado\*\*/)
    assert.match(md, /\*\*No probado\.\*\*/)
    assert.doesNotMatch(md, /Presence accuracy \(I4\) \| 100/)
  })

  it("builds artifacts without inventing baseline", () => {
    const run = mkRun()
    const { metrics } = buildArtifacts(run)
    assert.equal(metrics.stt.status, "medido")
    assert.equal(metrics.presence.accuracy, 1)
    assert.equal(metrics.layer, "C-e2e")
    assert.ok(metrics.stt)
  })

  it("renders WER/CER por categoría and top confusiones (Fase 5)", () => {
    const md = renderReport(mkRun())
    assert.match(md, /### WER\/CER por categoría/)
    assert.match(md, /\| simple \| 1 \| 0\.0% \| 0\.0% \|/)
    assert.match(md, /\| negation \| 1 \| 25\.0% \| \d+\.\d+% \|/) // 1 sub en 4 tokens
    assert.match(md, /### Top confusiones léxicas \(Whisper vs gold\)/)
    assert.match(md, /\| izquierda \| derecha \| 1 \|/)
    assert.match(md, /Solo sustituciones token-a-token/)
  })

  it("omits the two new sections when the run predates Fase 5", () => {
    const run = mkRun()
    delete run.summary.stt.werPerCategory
    delete run.summary.stt.topConfusions
    const md = renderReport(run)
    assert.doesNotMatch(md, /### WER\/CER por categoría/)
    assert.doesNotMatch(md, /### Top confusiones léxicas/)
  })
})

describe("alignTokens (Fase 5)", () => {
  it("aligns identical token lists as all matches", () => {
    const ops = alignTokens(["hola", "mundo"], ["hola", "mundo"])
    assert.deepEqual(ops, [
      { type: "match", ref: "hola", hyp: "hola" },
      { type: "match", ref: "mundo", hyp: "mundo" },
    ])
  })

  it("reads a one-word swap as one substitution", () => {
    const ops = alignTokens(["cintura", "espalda"], ["centura", "espalda"])
    assert.deepEqual(ops, [
      { type: "sub", ref: "cintura", hyp: "centura" },
      { type: "match", ref: "espalda", hyp: "espalda" },
    ])
  })

  it("labels a word only in the hypothesis as an insertion", () => {
    const ops = alignTokens(["uno", "tres"], ["uno", "dos", "tres"])
    assert.deepEqual(ops, [
      { type: "match", ref: "uno", hyp: "uno" },
      { type: "ins", hyp: "dos" },
      { type: "match", ref: "tres", hyp: "tres" },
    ])
  })

  it("labels a word only in the reference as a deletion", () => {
    const ops = alignTokens(["uno", "dos", "tres"], ["uno", "tres"])
    assert.deepEqual(ops, [
      { type: "match", ref: "uno", hyp: "uno" },
      { type: "del", ref: "dos" },
      { type: "match", ref: "tres", hyp: "tres" },
    ])
  })

  it("always counts exactly editDistance ops", () => {
    const a = ["a", "b", "c"]
    const b = ["x", "y"]
    const ops = alignTokens(a, b)
    assert.equal(ops.filter((o) => o.type !== "match").length, 3)
  })
})

describe("extractConfusions (Fase 5)", () => {
  it("returns gold→hyp substitution pairs, ignoring matches", () => {
    const confusions = extractConfusions("cintura espalda", "centura espalda")
    assert.deepEqual(confusions, [{ ref: "cintura", hyp: "centura", count: 1 }])
  })

  it("repeated pairs across one alignment are aggregated and sorted desc", () => {
    const confusions = extractConfusions("dolor dolor tos", "dar dolor tus")
    const byRef = Object.fromEntries(confusions.map((c) => [c.ref, c]))
    assert.equal(byRef.dolor.count, 1)
    assert.ok(confusions[0].type === undefined) // flat pair objects, no op type
    assert.equal(confusions.length, 2)
  })
})

describe("summarizeStt por categoría y confusiones (Fase 5)", () => {
  it("groups WER/CER by category when entries carry category", () => {
    const s = summarizeStt(
      [
        {
          id: "01",
          category: "noisy-text",
          metrics: computeSttMetrics({ referenceText: "a b c", hypothesisText: "a b c" }),
        },
        {
          id: "02",
          category: "noisy-text",
          metrics: computeSttMetrics({ referenceText: "a b c d", hypothesisText: "a b c" }),
        },
        {
          id: "03",
          category: "simple",
          metrics: computeSttMetrics({ referenceText: "a b", hypothesisText: "a b" }),
        },
      ],
      {
        confusions: [
          { reference: "cintura espalda", hypothesis: "centura espalda" },
          { reference: "cintura otra vez", hypothesis: "centura otra vez" },
        ],
      },
    )
    assert.equal(s.status, "medido")
    assert.equal(Object.keys(s.werPerCategory).length, 2)
    assert.equal(s.werPerCategory["noisy-text"].cases, 2)
    assert.ok(s.werPerCategory["noisy-text"].meanWer > 0)
    assert.equal(s.werPerCategory["simple"].cases, 1)
    assert.equal(s.werPerCategory["simple"].meanWer, 0)
    assert.deepEqual(s.topConfusions.slice(0, 1), [
      { ref: "cintura", hyp: "centura", count: 2 },
    ])
  })

  it("keeps the previous shape when no category/confusions are provided", () => {
    const s = summarizeStt([
      { id: "01", metrics: computeSttMetrics({ referenceText: "a b", hypothesisText: "a b" }) },
    ])
    assert.equal(s.status, "medido")
    assert.deepEqual(s.werPerCategory, {})
    assert.deepEqual(s.topConfusions, [])
  })
})

describe("scoreQuoteCoverage (Fase 2)", () => {
  it("counts a quote contained in the section text as found", () => {
    const gold = {
      sections: {
        visit_context: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: ["Dolor de rodilla"] },
        clinical_narrative: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: ["Hace tres dias"] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla izquierda.", presence: "STATED", sourceSegmentIds: [], reviewed: false },
        clinical_narrative: { text: "Niega fiebre.", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreQuoteCoverage(gold, note)
    assert.deepEqual(r.bySection.visit_context, { total: 1, found: 1 })
    assert.equal(r.bySection.clinical_narrative.found, 0)
    assert.equal(r.aggregate.found, 1)
    assert.equal(r.aggregate.total, 2)
  })

  it("is empty when no section carries quotes (or note is null)", () => {
    const gold = {
      sections: Object.fromEntries(
        SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] }]),
      ),
    }
    const r = scoreQuoteCoverage(gold, null)
    assert.deepEqual(r.bySection, {})
    assert.equal(r.aggregate.total, 0)
    assert.equal(r.aggregate.recall, null)
  })

  it("counts UNKNOWN sections that carry sourceQuotes (12-contradiction shape)", () => {
    const gold = {
      sections: {
        visit_context: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinical_narrative: { presence: "UNKNOWN", mustInclude: [], mustNotInclude: [], sourceQuotes: ["me faltó el aire"] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "UNKNOWN", mustInclude: [], mustNotInclude: [], sourceQuotes: ["Queda incierto."] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const note = {
      sections: {
        visit_context: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinical_narrative: { text: "Primero dijo que me faltó el aire ayer y luego lo negó.", presence: "UNKNOWN", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "Indeterminado", presence: "UNKNOWN", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreQuoteCoverage(gold, note)
    assert.deepEqual(r.bySection.clinical_narrative, { total: 1, found: 1 })
    assert.equal(r.bySection.reported_findings.found, 0)
    assert.equal(r.aggregate.total, 2)
  })
})

describe("scoreMustNotInclude (Fase 2)", () => {
  it("lists per-section mustNotInclude hits when the term appears in that section", () => {
    const gold = {
      sections: {
        visit_context: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: ["diagnóstico"], sourceQuotes: [] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: ["neumonia"], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const note = {
      sections: {
        visit_context: { text: "Diagnóstico de alergia.", presence: "STATED", sourceSegmentIds: [], reviewed: false },
        clinical_narrative: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreMustNotInclude(gold, note)
    assert.deepEqual(r.bySection.visit_context, ["diagnóstico"])
    assert.equal(r.bySection.clinician_documented_assessment, undefined)
    assert.equal(r.hasHit, true)
    assert.deepEqual(r.all, ["diagnóstico"])
  })

  it("returns no hits when none appear", () => {
    const gold = {
      sections: {
        visit_context: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: ["diagnóstico"], sourceQuotes: [] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const note = {
      sections: Object.fromEntries(
        SECTION_IDS.map((id) => [id, { text: "Sin hallazgos.", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false }]),
      ),
    }
    const r = scoreMustNotInclude(gold, note)
    assert.deepEqual(r.bySection, {})
    assert.equal(r.hasHit, false)
    assert.equal(r.all.length, 0)
  })
})

describe("scoreSourceSupport (Fase 2)", () => {
  it("marks a segment as supported when its text backs the section", () => {
    const transcript = [{ id: "seg-1", text: "dolor de rodilla", startMs: 0 }]
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla izquierda.", presence: "STATED", sourceSegmentIds: ["seg-1"], reviewed: false },
        clinical_narrative: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreSourceSupport(note, transcript)
    assert.deepEqual(r.bySection.visit_context, { segments: 1, found: 1, supported: 1 })
    assert.equal(r.literalMissSections.length, 0)
    assert.equal(r.invalidIds.length, 0)
  })

  it("reports a literal miss when the segment exists but does not back the section", () => {
    const transcript = [{ id: "seg-2", text: "habla de su familia", startMs: 0 }]
    const note = {
      sections: {
        visit_context: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinical_narrative: { text: "Paciente con tos seca.", presence: "STATED", sourceSegmentIds: ["seg-2"], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreSourceSupport(note, transcript)
    assert.deepEqual(r.bySection.clinical_narrative, { segments: 1, found: 1, supported: 0 })
    assert.deepEqual(r.literalMissSections, ["clinical_narrative"])
    assert.equal(r.invalidIds.length, 0)
  })

  it("returns invalid ids for cited ids missing from the transcript", () => {
    const transcript = [{ id: "seg-1", text: "algo", startMs: 0 }]
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla.", presence: "STATED", sourceSegmentIds: ["seg-99"], reviewed: false },
        clinical_narrative: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const r = scoreSourceSupport(note, transcript)
    assert.deepEqual(r.invalidIds, ["seg-99"])
    assert.deepEqual(r.bySection.visit_context, { segments: 1, found: 0, supported: 0 })
  })
})

describe("evaluateCase: unsupportedFacts (Fase 2)", () => {
  it("combines the four unsupported-fact kinds in one shape", () => {
    const transcript = [
      { id: "seg-1", text: "dolor de rodilla", startMs: 0 },
      { id: "seg-2", text: "habla de su familia", startMs: 9 },
    ]
    const gold = {
      must_not_contain: ["faringitis"],
      sections: {
        visit_context: { presence: "STATED", mustInclude: [], mustNotInclude: ["diagnóstico"], sourceQuotes: ["Dolor de rodilla"] },
        clinical_narrative: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        relevant_history: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla; sospecha de faringitis y diagnóstico.", presence: "STATED", sourceSegmentIds: ["seg-1"], reviewed: false },
        clinical_narrative: { text: "Paciente con tos seca.", presence: "STATED", sourceSegmentIds: ["seg-2"], reviewed: false },
        relevant_history: { text: "Alérgico.", presence: "STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: null })
    const kinds = new Set(ev.unsupportedFacts.map((f) => f.kind))
    assert.ok(kinds.has("must_not_contain"), "must_not_contain (faringitis) counted")
    assert.ok(kinds.has("mustNotInclude"), "mustNotInclude (diagnóstico) counted")
    assert.ok(kinds.has("stated_without_source"), "stated_without_source (relevant_history) counted")
    assert.ok(kinds.has("source_not_supported"), "source_not_supported (clinical_narrative with seg-2 not backing) counted")
    assert.equal(ev.unsupportedFactCount, ev.unsupportedFacts.length)
  })
})

describe("summarize: extractionFidelity + unsupportedFact (Fase 2)", () => {
  it("aggregates quote recall and flags the one unsupported case", () => {
    const gold = {
      must_not_contain: ["faringitis"],
      sections: {
        visit_context: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: ["dolor de rodilla"] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const transcript = [{ id: "seg-1", text: "dolor de rodilla", startMs: 0 }]
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla izquierda; sospecha de faringitis.", presence: "STATED", sourceSegmentIds: ["seg-1"], reviewed: false },
        clinical_narrative: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: null })
    const summary = summarize([{ id: "01", evaluation: ev, error: null, latencyMs: 10 }])
    assert.equal(summary.extractionFidelity.quoteTotal, 1)
    assert.equal(summary.extractionFidelity.quoteHits, 1)
    assert.equal(summary.unsupportedFact.casesWithFacts, 1)
    assert.equal(summary.unsupportedFact.kinds.must_not_contain, 1)
  })
})

describe("summarizeStt: transcribe retry rate (Fase 2)", () => {
  it("computes retry/1er-intento rates from transcribeAttempts (objeto keyed by id)", () => {
    const s = summarizeStt(
      [
        { id: "a", metrics: computeSttMetrics({ referenceText: "x", hypothesisText: "x" }) },
        { id: "b", metrics: computeSttMetrics({ referenceText: "x", hypothesisText: "x" }) },
        { id: "c", metrics: computeSttMetrics({ referenceText: "x", hypothesisText: "x" }) },
      ],
      { transcribeAttempts: { a: 1, b: 3, c: 2 } },
    )
    assert.equal(s.status, "medido")
    assert.equal(s.transcribeRetryCases, 2)
    assert.equal(s.transcribeRetries, 3) // (3-1)+(2-1)
    assert.equal(s.transcribeFirstTryRate, 1 / 3)
    assert.ok(Math.abs(s.transcribeRetryRate - 2 / 3) < 1e-12)
  })

  it("keeps the previous shape when transcribeAttempts is not provided (backward compat Fase 5)", () => {
    const s = summarizeStt([
      { id: "a", metrics: computeSttMetrics({ referenceText: "x", hypothesisText: "x" }) },
    ])
    assert.equal(s.status, "medido")
    assert.equal(s.transcribeRetryRate, undefined)
    assert.equal(s.transcribeFirstTryRate, undefined)
    assert.equal(s.transcribeRetries, undefined)
  })
})

describe("Report Fase 2: fidelity + unsupported + retry", () => {
  it("renders Fidelidad de extracción + Unsupported clinical facts + retry rows when data is present", () => {
    const gold = {
      must_not_contain: ["faringitis"],
      sections: {
        visit_context: { presence: "STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: ["dolor de rodilla"] },
        clinical_narrative: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        relevant_history: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        reported_findings: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_assessment: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        clinician_documented_plan: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
        follow_up: { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] },
      },
    }
    const transcript = [{ id: "seg-1", text: "dolor de rodilla", startMs: 0 }]
    const note = {
      sections: {
        visit_context: { text: "Dolor de rodilla; faringitis.", presence: "STATED", sourceSegmentIds: ["seg-1"], reviewed: false },
        clinical_narrative: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        relevant_history: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        reported_findings: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_assessment: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        clinician_documented_plan: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
        follow_up: { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false },
      },
    }
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: '{"a":1}' })
    const rows = [{ id: "01", category: "simple", evaluation: ev, error: null, latencyMs: 10, transcribeMs: 60, structureMs: 40, stt: { reference: "dolor de rodilla", hypothesis: "dolor de rodilla" } }]
    const summary = summarize([{ id: "01", evaluation: ev, error: null, latencyMs: 10 }])
    summary.skippedNoAudio = 0
    summary.stt = summarizeStt(
      [{ id: "01", category: "simple", metrics: computeSttMetrics({ reference: "dolor de rodilla", hypothesis: "dolor de rodilla" }) }],
      { transcribeAttempts: { "01": 2 } },
    )
    const run = {
      metadata: {
        evaluatorVersion: 1, stage: "e2e", layer: "C-e2e", runId: "test-F2",
        startedAt: "2026-09-13T00:00:00.000Z", adapter: "qvac",
        skipStt: false, datasetCases: 1,
        node: "v24", electron: null, sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { stt: "WHISPER_QVAC_LOCAL", structuring: "QWEN3_4B_Q4_K_M" },
        gitCommit: null, datasetHash: "abc", sourceHashes: {}, evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results: rows.map((r) => ({ ...r, gold, note, transcript, baselinePresence: null, baselinePresencePairs: [], baselineLatencyMs: null })),
    }
    const md = renderReport(run)
    assert.match(md, /Raw JSON valid rate \(primer intento\)/)
    assert.match(md, /Fidelidad de extracci[óo]n/)
    assert.match(md, /Unsupported clinical facts/)
    assert.match(md, /Transcribe retry rate/)
    assert.match(md, /Transcribe 1er intento/)
  })

  it("omits the unsupported section when there are 0 facts", () => {
    const gold = {
      must_not_contain: [],
      sections: Object.fromEntries(SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] }])),
    }
    const transcript = [{ id: "seg-1", text: "algo", startMs: 0 }]
    const note = emptyNote()
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: '{"a":1}' })
    const summary = summarize([{ id: "01", evaluation: ev, error: null, latencyMs: 10 }])
    summary.skippedNoAudio = 0
    summary.stt = sttNotMeasured("stub")
    const run = {
      metadata: {
        evaluatorVersion: 1, stage: "off", layer: "A-skip-stt", runId: "test-F2-noop",
        startedAt: "2026-09-13T00:00:00.000Z", adapter: "qvac",
        skipStt: true, datasetCases: 1,
        node: "v24", electron: null, sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { stt: null, structuring: "QWEN3_4B_Q4_K_M" },
        gitCommit: null, datasetHash: "abc", sourceHashes: {}, evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results: [{ id: "01", category: "simple", gold, note, transcript, evaluation: ev, error: null, latencyMs: 10 }],
    }
    const md = renderReport(run)
    assert.doesNotMatch(md, /### Unsupported clinical facts/)
  })
})

describe("coldHotMetrics (Fase 3) — breakdown frío/caliente", () => {
  it("derives ratio steady / warmup for 2+ latencies", () => {
    const r = coldHotMetrics(100, [200, 300, 400])
    assert.equal(r.warmupMs, 100)
    assert.equal(r.firstLatencyMs, 200)
    assert.equal(r.steadyP50, latencyStats([300, 400]).p50)
    assert.equal(r.ratio, r.steadyP50 / 100)
  })
  it("guards invalid warmup or <2 latencies", () => {
    assert.equal(coldHotMetrics(null, [10, 20]), null)
    assert.equal(coldHotMetrics(0, [10, 20]), null)
    assert.equal(coldHotMetrics(100, [200]), null)
    assert.equal(coldHotMetrics(100, []), null)
  })
})

describe("Report Fase 3: latencia por fase + frío/caliente", () => {
  function baseSummary(evs) {
    const s = summarize(evs)
    s.skippedNoAudio = 0
    s.sttLatency = latencyStats([21800, 21200])
    s.coldHot = { warmupMs: 18420, firstLatencyMs: 57612, steadyP50: 48600, ratio: 48600 / 18420 }
    s.stt = sttNotMeasured("stub solo clasificación")
    return s
  }

  it("renders Breakdown frío/caliente + Latency STT p50 when data is present", () => {
    const gold = { sections: Object.fromEntries(SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] }])) }
    const transcript = [{ id: "seg-1", text: "algo", startMs: 0 }]
    const note = emptyNote()
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: '{"a":1}' })
    const summary = baseSummary([{ id: "a01", evaluation: ev, error: null, latencyMs: 57612 }])
    const run = {
      metadata: {
        evaluatorVersion: 1, stage: "e2e", layer: "C-e2e", runId: "test-F3",
        startedAt: "2026-09-13T00:00:00.000Z", adapter: "qvac",
        skipStt: false, datasetCases: 2,
        node: "v24", electron: null, sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { stt: "WHISPER_QVAC_LOCAL", structuring: "QWEN3_4B_Q4_K_M" },
        gitCommit: null, datasetHash: "abc", sourceHashes: {}, evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results: [{ id: "a01", category: "simple", gold, note, transcript, evaluation: ev, error: null, latencyMs: 57612, transcribeMs: 21800, structureMs: 35200 }],
    }
    const md = renderReport(run)
    assert.match(md, /Latency STT p50/)
    assert.match(md, /### Breakdown fr[íi]o\/caliente/)
    assert.match(md, /Warmup \(carga modelo\)/)
    assert.match(md, /Caliente \/ fr[íi]o/)
  })

  it("omits the Breakdown section when coldHot is absent", () => {
    const gold = { sections: Object.fromEntries(SECTION_IDS.map((id) => [id, { presence: "NOT_STATED", mustInclude: [], mustNotInclude: [], sourceQuotes: [] }])) }
    const transcript = [{ id: "seg-1", text: "algo", startMs: 0 }]
    const note = emptyNote()
    const ev = evaluateCase({ gold, note, transcript, rawSdkText: '{"a":1}' })
    const summary = summarize([{ id: "a01", evaluation: ev, error: null, latencyMs: 10 }])
    summary.skippedNoAudio = 0
    summary.coldHot = null
    summary.sttLatency = null
    summary.stt = sttNotMeasured("stub")
    const run = {
      metadata: {
        evaluatorVersion: 1, stage: "e2e", layer: "C-e2e", runId: "test-F3-noop",
        startedAt: "2026-09-13T00:00:00.000Z", adapter: "qvac",
        skipStt: false, datasetCases: 1,
        node: "v24", electron: null, sdk: "0.18.2",
        hardware: { platform: "win32", arch: "x64", cpu: "test" },
        models: { stt: "WHISPER_QVAC_LOCAL", structuring: "QWEN3_4B_Q4_K_M" },
        gitCommit: null, datasetHash: "abc", sourceHashes: {}, evidence_rule: "medido | observado | inferido | no_probado",
      },
      summary,
      results: [{ id: "a01", category: "simple", gold, note, transcript, evaluation: ev, error: null, latencyMs: 10, transcribeMs: 4, structureMs: 6 }],
    }
    const md = renderReport(run)
    assert.doesNotMatch(md, /### Breakdown fr[íi]o\/caliente/)
  })
})
