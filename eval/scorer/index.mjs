/** Pure Oira eval scorer (Capa A). No model I/O. Empty denominators → null. */

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

export function editDistance(a, b) {
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
  return dp[a.length][b.length]
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
  }
}

function summarizeLatency(samples) {
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

  return {
    cases: results.length,
    errors,
    productEmittedRate: ratio(emitted.length, results.length),
    rawJsonValidRate: ratio(rawValid, rawKnown),
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
    latency: summarizeLatency(latencies),
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
