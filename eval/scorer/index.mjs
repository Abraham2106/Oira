/** Pure Oira eval scorer (Capa A). No model I/O. Empty denominators → null. */

import {
  scoreMustNotInclude,
  scoreQuoteCoverage,
  scoreSourceSupport,
} from "./extraction-fidelity.mjs"

export const SECTION_IDS = [
  "visit_context",
  "clinical_narrative",
  "relevant_history",
  "reported_findings",
  "clinician_documented_assessment",
  "clinician_documented_plan",
  "follow_up",
]

export const PRESENCE_LABELS = ["STATED", "NOT_STATED", "UNKNOWN"]

export function ratio(numerator, denominator) {
  if (!Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

export function normalizeText(value) {
  if (typeof value !== "string") return ""
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function containsNormalized(haystack, needle) {
  const h = normalizeText(haystack)
  const n = normalizeText(needle)
  if (!n) return false
  return h.includes(n)
}

export function quantile(values, p) {
  const a = [...values].filter((n) => Number.isFinite(n)).sort((x, y) => x - y)
  if (!a.length) return null
  if (a.length === 1) return a[0]
  const pos = (a.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return a[lo] + (a[hi] - a[lo]) * (pos - lo)
}

function emptyConfusion() {
  return Object.fromEntries(
    PRESENCE_LABELS.map((actual) => [
      actual,
      Object.fromEntries(PRESENCE_LABELS.map((predicted) => [predicted, 0])),
    ]),
  )
}

/**
 * @param {Array<{ gold: string, pred: string }>} pairs
 */
export function presenceMetrics(pairs) {
  const confusion = emptyConfusion()
  let correct = 0
  for (const pair of pairs) {
    if (!PRESENCE_LABELS.includes(pair.gold) || !PRESENCE_LABELS.includes(pair.pred)) continue
    confusion[pair.gold][pair.pred] += 1
    if (pair.gold === pair.pred) correct += 1
  }
  const n = pairs.filter(
    (p) => PRESENCE_LABELS.includes(p.gold) && PRESENCE_LABELS.includes(p.pred),
  ).length

  const perClass = Object.fromEntries(
    PRESENCE_LABELS.map((label) => {
      const tp = confusion[label][label]
      const fp = PRESENCE_LABELS.reduce(
        (sum, actual) => sum + (actual === label ? 0 : confusion[actual][label]),
        0,
      )
      const fn = PRESENCE_LABELS.reduce(
        (sum, predicted) => sum + (predicted === label ? 0 : confusion[label][predicted]),
        0,
      )
      const support = PRESENCE_LABELS.reduce((sum, predicted) => sum + confusion[label][predicted], 0)
      const predictedCount = PRESENCE_LABELS.reduce(
        (sum, actual) => sum + confusion[actual][label],
        0,
      )
      if (support === 0 && predictedCount === 0) {
        return [label, { tp, fp, fn, support, precision: null, recall: null, f1: null }]
      }
      const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
      const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
      const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
      return [label, { tp, fp, fn, support, precision, recall, f1 }]
    }),
  )

  const f1Values = PRESENCE_LABELS.map((label) => perClass[label].f1).filter((v) => v !== null)
  return {
    n,
    correct,
    accuracy: ratio(correct, n),
    confusion,
    perClass,
    macroF1: f1Values.length === 0 ? null : f1Values.reduce((a, b) => a + b, 0) / f1Values.length,
  }
}

export function tokenize(text) {
  const normalized = normalizeText(text)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
}

/**
 * Levenshtein DP matrix for two sequences. Shared by `editDistance` (distance
 * only) and `alignTokens` (backtracking alignment). Not exported.
 */
function levenshteinTable(a, b) {
  const rows = a.length + 1
  const cols = b.length + 1
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) dp[i][0] = i
  for (let j = 0; j < cols; j++) dp[0][j] = j
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp
}

export function editDistance(a, b) {
  const dp = levenshteinTable(a, b)
  return dp[a.length][b.length]
}

/**
 * Token-to-token Levenshtein alignment. Backtracks the shared DP matrix
 * producing a left-to-right op list:
 *   { type: "match"|"sub", ref, hyp } | { type: "ins", hyp } | { type: "del", ref }
 * Each step only follows a move consistent with the DP values (so the op count
 * always equals `editDistance`). Preference among equally-consistent moves at a
 * cell: diagonal match, then diagonal sub, then del, then ins — `sub` wins over
 * del+ins so a one-token swap reads as one confusion pair, not two.
 *
 * @param {string[]} a reference tokens
 * @param {string[]} b hypothesis tokens
 */
export function alignTokens(a, b) {
  const dp = levenshteinTable(a, b)
  const ops = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    const diag =
      i > 0 && j > 0 ? (a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : dp[i - 1][j - 1] + 1) : Infinity
    const up = i > 0 ? dp[i - 1][j] + 1 : Infinity
    const left = j > 0 ? dp[i][j - 1] + 1 : Infinity

    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && diag === dp[i][j]) {
      ops.push({ type: "match", ref: a[i - 1], hyp: b[j - 1] })
      i--
      j--
    } else if (i > 0 && j > 0 && diag === dp[i][j]) {
      ops.push({ type: "sub", ref: a[i - 1], hyp: b[j - 1] })
      i--
      j--
    } else if (i > 0 && up === dp[i][j]) {
      ops.push({ type: "del", ref: a[i - 1] })
      i--
    } else {
      ops.push({ type: "ins", hyp: b[j - 1] })
      j--
    }
  }
  return ops.reverse()
}

// Boundary punctuation that Whisper attaches to tokens ("dias…", "¿como",
// "local."). Stripped for confusion comparison so formatting noise ("dias…" →
// "dias,") is not reported as a lexical error. Kept verbatim in `tokenize` —
// WER/CER semantics are untouched.
const BOUNDARY_PUNCT = /^[¿¡?.,;:!…'"“”()]+|[¿¡?.,;:!…'"“”()]+$/g

function stripBoundaryPunct(token) {
  return token.replace(BOUNDARY_PUNCT, "")
}

/**
 * Lexical confusion pairs (gold→hypothesis substitutions). Tokenizes both
 * texts, aligns, and keeps only `sub` ops whose tokens still differ after
 * boundary punctuation is stripped (pure formatting changes are skipped).
 * Groups identical pairs by frequency and returns them sorted
 * count-descending. Pure/deterministic; no model I/O.
 *
 * @param {string} reference gold transcript text
 * @param {string} hypothesis Whisper transcript text
 * @returns {Array<{ ref: string, hyp: string, count: number }>}
 */
export function extractConfusions(reference, hypothesis) {
  const aligns = alignTokens(tokenize(reference), tokenize(hypothesis))
  const counts = new Map()
  for (const op of aligns) {
    if (op.type !== "sub") continue
    const ref = stripBoundaryPunct(op.ref)
    const hyp = stripBoundaryPunct(op.hyp)
    if (!ref || !hyp || ref === hyp) continue // punctuation-only, not a word error
    const key = `${ref}\t${hyp}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [ref, hyp] = key.split("\t")
      return { ref, hyp, count }
    })
    .sort((x, y) => y.count - x.count)
}

export function wordErrorRate(reference, hypothesis) {
  const ref = tokenize(reference)
  const hyp = tokenize(hypothesis)
  if (ref.length === 0) return null
  return editDistance(ref, hyp) / ref.length
}

export function charErrorRate(reference, hypothesis) {
  const ref = [...normalizeText(reference)].filter((ch) => ch !== " ")
  const hyp = [...normalizeText(hypothesis)].filter((ch) => ch !== " ")
  if (ref.length === 0) return null
  return editDistance(ref, hyp) / ref.length
}

export function sttNotMeasured(reason) {
  return {
    status: "no_medido",
    reason,
    wer: null,
    cer: null,
    evidence: "no_probado",
  }
}

function looksLikeJson(text) {
  if (typeof text !== "string" || !text.trim()) return false
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  const candidate =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
  try {
    JSON.parse(candidate)
    return true
  } catch {
    return false
  }
}

/**
 * @param {{
 *   gold: object,
 *   note: object | null,
 *   transcript?: object[],
 *   error?: string | null,
 *   rawSdkText?: string | null,
 *   latencyMs?: number | null,
 * }} input
 */
export function evaluateCase(input) {
  const failed = Boolean(input.error)
  const note = failed ? null : input.note
  const transcript = input.transcript ?? []
  const presencePairs = []
  const mustInclude = {}

  if (note) {
    for (const id of SECTION_IDS) {
      const goldPresence = input.gold.sections?.[id]?.presence
      const predPresence = note.sections?.[id]?.presence
      if (PRESENCE_LABELS.includes(goldPresence) && PRESENCE_LABELS.includes(predPresence)) {
        presencePairs.push({ sectionId: id, gold: goldPresence, pred: predPresence })
      }
      const needles = input.gold.sections?.[id]?.mustInclude ?? []
      const text = note.sections?.[id]?.text ?? ""
      const found = needles.filter((needle) => containsNormalized(text, needle)).length
      mustInclude[id] = { total: needles.length, found, hitRate: ratio(found, needles.length) }
    }
  } else {
    for (const id of SECTION_IDS) {
      mustInclude[id] = { total: input.gold.sections?.[id]?.mustInclude?.length ?? 0, found: 0, hitRate: null }
    }
  }

  const noteText = note
    ? SECTION_IDS.map((id) => note.sections[id]?.text ?? "").join("\n")
    : ""
  const mustNot = Array.isArray(input.gold.must_not_contain) ? input.gold.must_not_contain : []
  const mustNotContainHits = note ? mustNot.filter((term) => containsNormalized(noteText, term)) : []

  const ids = new Set(transcript.map((segment) => segment.id))
  const statedWithoutSource = []
  const invalidSourceIds = []
  if (note) {
    for (const id of SECTION_IDS) {
      const field = note.sections[id]
      if (field.presence === "STATED" && (!field.sourceSegmentIds || field.sourceSegmentIds.length === 0)) {
        statedWithoutSource.push(id)
      }
      for (const sourceId of field.sourceSegmentIds ?? []) {
        if (!ids.has(sourceId)) invalidSourceIds.push(sourceId)
      }
    }
  }

  const rawSdkText = input.rawSdkText ?? null
  const rawJsonValid =
    rawSdkText === null || rawSdkText === undefined ? null : looksLikeJson(rawSdkText)

  // --- Fase 2: fidelidad de extracción (sourceQuotes, mustNotInclude,
  // soporte literal de source) + unsupported facts (§15.1). Match literal
  // normalizado; no semántico. ---
  const quoteCoverage = scoreQuoteCoverage(input.gold, note)
  const mustNotIncludeHits = scoreMustNotInclude(input.gold, note)
  const sourceSupport = scoreSourceSupport(note, transcript)

  const unsupportedFacts = []
  const pushFacts = (kind, entries) => {
    for (const entry of entries) {
      unsupportedFacts.push({
        sectionId: entry.sectionId ?? null,
        kind,
        term: typeof entry.term === "string" ? entry.term : null,
      })
    }
  }
  pushFacts("must_not_contain", mustNotContainHits.map((term) => ({ term })))
  // mustNotInclude por sección (Fase 2: recién puntuado)
  for (const [sectionId, terms] of Object.entries(mustNotIncludeHits.bySection)) {
    pushFacts("mustNotInclude", terms.map((term) => ({ sectionId, term })))
  }
  // STATED sin sourceSegmentIds
  pushFacts("stated_without_source", statedWithoutSource.map((sectionId) => ({ sectionId })))
  // Segmento citado existe pero su texto no respalda el valor extraído
  pushFacts("source_not_supported", sourceSupport.literalMissSections.map((sectionId) => ({ sectionId })))

  return {
    productEmitted: Boolean(note) && !failed,
    error: input.error ?? null,
    latencyMs: failed ? null : (input.latencyMs ?? null),
    presencePairs,
    presence: presenceMetrics(presencePairs),
    invention: mustNotContainHits.length > 0,
    mustNotContainHits,
    mustInclude,
    statedWithoutSource,
    invalidSourceIds,
    verifySourceOk: invalidSourceIds.length === 0,
    rawJsonValid,
    rawSdkText,
    quoteCoverage,
    mustNotIncludeHits,
    sourceSupport,
    unsupportedFacts,
    unsupportedFactCount: unsupportedFacts.length,
  }
}

export function latencyStats(samples) {
  return {
    samples: samples.length,
    p50: quantile(samples, 0.5),
    p95: quantile(samples, 0.95),
    p99: quantile(samples, 0.99),
    mean: samples.length === 0 ? null : samples.reduce((a, b) => a + b, 0) / samples.length,
    min: samples.length === 0 ? null : Math.min(...samples),
    max: samples.length === 0 ? null : Math.max(...samples),
  }
}

/**
 * @param {Array<{ id: string, evaluation: ReturnType<typeof evaluateCase>, error?: string | null, latencyMs?: number | null }>} results
 */
export function summarize(results) {
  const evaluations = results.map((r) => r.evaluation)
  const errors = results.filter((r) => r.error || r.evaluation.error).length
  const emitted = evaluations.filter((e) => e.productEmitted)
  const allPairs = emitted.flatMap((e) => e.presencePairs)
  const presence = presenceMetrics(allPairs)

  const mustIncludeHits = emitted.reduce(
    (sum, e) => sum + Object.values(e.mustInclude).reduce((s, row) => s + row.found, 0),
    0,
  )
  const mustIncludeTotal = emitted.reduce(
    (sum, e) => sum + Object.values(e.mustInclude).reduce((s, row) => s + row.total, 0),
    0,
  )
  const inventionCases = evaluations.filter((e) => e.invention).length
  const rawKnown = evaluations.filter((e) => e.rawJsonValid !== null).length
  const rawValid = evaluations.filter((e) => e.rawJsonValid === true).length
  const latencies = emitted
    .map((e) => e.latencyMs)
    .filter((n) => Number.isFinite(n))
  const statedWithoutSource = emitted.reduce((sum, e) => sum + e.statedWithoutSource.length, 0)
  const sourceIdFailureCases = emitted.filter((e) => !e.verifySourceOk).length

  // --- Fase 2: fidelidad de extracción + unsupported facts (agregado) ---
  const quoteTotal = emitted.reduce((sum, e) => sum + e.quoteCoverage.aggregate.total, 0)
  const quoteHits = emitted.reduce((sum, e) => sum + e.quoteCoverage.aggregate.found, 0)
  const mnihits = emitted.reduce(
    (sum, e) => sum + Object.values(e.mustNotIncludeHits.bySection).flat().length,
    0,
  )
  const mustNotIncludeCases = emitted.filter((e) => e.mustNotIncludeHits.hasHit).length
  const unsupportedCases = emitted.filter((e) => e.unsupportedFactCount > 0).length
  const unsupportedFacts = emitted.flatMap((e) => e.unsupportedFacts)
  // sourceSupport.bySection solo incluye secciones STATED con sourceSegmentIds;
  // contamos los segmentos encontrados y respaldados
  const sourceSegsFound = emitted.reduce(
    (sum, e) => sum + Object.values(e.sourceSupport.bySection).reduce((s, row) => s + row.found, 0),
    0,
  )
  const sourceSegsSupported = emitted.reduce(
    (sum, e) =>
      sum + Object.values(e.sourceSupport.bySection).reduce((s, row) => s + row.supported, 0),
    0,
  )
  const literalMissCases = emitted.filter((e) => e.sourceSupport.literalMissSections.length > 0).length

  return {
    cases: results.length,
    errors,
    productEmittedRate: ratio(emitted.length, results.length),
    rawJsonValidRate: ratio(rawValid, rawKnown),
    extractionFidelity: {
      quoteRecall: ratio(quoteHits, quoteTotal),
      quoteHits,
      quoteTotal,
      sourceVerificationRate: ratio(sourceSegsSupported, sourceSegsFound),
      sourceSegsFound,
      sourceSegsSupported,
      sourceLiteralMissCases: literalMissCases,
    },
    mustNotInclude: {
      casesWithHits: mustNotIncludeCases,
      hits: mnihits,
      rate: ratio(mustNotIncludeCases, emitted.length),
    },
    unsupportedFact: {
      casesWithFacts: unsupportedCases,
      facts: unsupportedFacts.length,
      rate: ratio(unsupportedCases, emitted.length),
      kinds: Object.fromEntries(
        ["must_not_contain", "mustNotInclude", "stated_without_source", "source_not_supported"].map(
          (kind) => [kind, unsupportedFacts.filter((f) => f.kind === kind).length],
        ),
      ),
    },
    presence: {
      accuracy: presence.accuracy,
      correct: presence.correct,
      total: presence.n,
      macroF1: presence.macroF1,
      byClass: presence.perClass,
      matrix: presence.confusion,
    },
    invention: {
      casesWithHits: inventionCases,
      rate: ratio(inventionCases, results.length),
    },
    mustIncludeCoverage: ratio(mustIncludeHits, mustIncludeTotal),
    mustIncludeHits,
    mustIncludeTotal,
    statedWithoutSource,
    sourceIdFailureCases,
    latency: latencyStats(latencies),
    stt: sttNotMeasured("Capa A: --skip-stt. No hay WAV de referencia en esta etapa."),
  }
}

// Back-compat aliases used by earlier drafts
export const normText = normalizeText
export const scorePresence = (goldSections, predSections, sectionIds = SECTION_IDS) => {
  const pairs = sectionIds.flatMap((id) => {
    const gold = goldSections[id]?.presence
    const pred = predSections[id]?.presence
    if (!PRESENCE_LABELS.includes(gold) || !PRESENCE_LABELS.includes(pred)) return []
    return [{ gold, pred, sectionId: id }]
  })
  const metrics = presenceMetrics(pairs)
  return {
    ...metrics,
    total: metrics.n,
    matrix: metrics.confusion,
    byClass: metrics.perClass,
    perSection: pairs.map((p) => ({
      sectionId: p.sectionId,
      gold: p.gold,
      predicted: p.pred,
      match: p.gold === p.pred,
      skipped: false,
    })),
  }
}
