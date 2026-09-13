import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  PRESENCE_LABELS,
  SECTION_IDS,
  charErrorRate,
  evaluateCase,
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
        category: "simple",
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
          hypothesis: "Dolor de rodilla izquierda",
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
        metrics: computeSttMetrics({
          reference: r.stt.reference,
          hypothesis: r.stt.hypothesis,
        }),
      })),
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
})
