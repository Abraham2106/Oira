/**
 * Oira eval — Nivel 1 (STT) metrics. Pure, no model I/O.
 *
 * Bounded by the same evidence rule as the Capa A scorer: never invent a
 * number. WER/CER helpers live in scorer/index.mjs; this module composes them
 * with empty-transcript and critical-error heuristics, following Albatross's
 * fill-detection pattern (adapted, secondary reference).
 */

import {
  charErrorRate,
  editDistance,
  extractConfusions,
  normalizeText,
  ratio,
  tokenize,
  wordErrorRate,
} from "./index.mjs"

/**
 * Join transcript segments into a single comparison string (reference or
 * hypothesis). Segments may carry { text } like TranscriptSegment.
 */
export function transcriptText(segments, { preserveTimestamps = false } = {}) {
  const list = Array.isArray(segments) ? segments : []
  if (list.length === 0) return ""
  return list
    .map((s) => {
      const text = (s && typeof s.text === "string" ? s.text : "").trim()
      if (!text) return ""
      return preserveTimestamps && Number.isFinite(s.startMs)
        ? `[${s.startMs}] ${text}`
        : text
    })
    .filter(Boolean)
    .join(" ")
}

/**
 * Whether the hypothesis dropped or added a "no" vs the reference (crude
 * negation-retention heuristic). Word-level, normalized, case-insensitive.
 * Marked HEURÍSTICO in reports — not a holistic clinical judgment.
 */
export function negationDeltas(reference, hypothesis) {
  const refWords = tokenize(reference)
  const hypWords = tokenize(hypothesis)
  const count = (words) => words.filter((w) => w === "no").length
  const dropped = count(refWords) - count(hypWords)
  return {
    dropped: Math.max(0, dropped), // negation present in gold, absent in STT
    added: Math.max(0, -dropped), // negation absent in gold, present in STT
  }
}

/**
 * Compute Nivel-1 STT metrics for one case.
 *
 * @param {{
 *   reference?: string | string[] | object[],
 *   hypothesis?: string | string[] | object[],
 *   referenceText?: string,
 *   hypothesisText?: string,
 * }} input  — pass text directly or transcript segment arrays.
 * @returns {{
 *   status: "medido",
 *   refTokens, hypTokens,
 *   wer, cer,
 *   transcribeSuccess: boolean,
 *   emptyTranscript: boolean,
 *   negation: { dropped, added },
 *   evidence: "medido",
 * }}
 */
export function computeSttMetrics(input) {
  const reference =
    input.referenceText ?? (Array.isArray(input.reference) ? transcriptText(input.reference) : (input.reference ?? ""))
  const hypothesis =
    input.hypothesisText ?? (Array.isArray(input.hypothesis) ? transcriptText(input.hypothesis) : (input.hypothesis ?? ""))

  const refTokens = tokenize(reference)
  const hypTokens = tokenize(hypothesis)
  const emptyTranscript = hypTokens.length === 0

  return {
    status: "medido",
    refTokens: refTokens.length,
    hypTokens: hypTokens.length,
    wer: wordErrorRate(reference, hypothesis),
    cer: charErrorRate(reference, hypothesis),
    transcribeSuccess: !emptyTranscript,
    emptyTranscript,
    negation: negationDeltas(reference, hypothesis),
    evidence: "medido",
  }
}

/**
 * Summarize STT metrics across cases. Optional per-result `category` groups
 * WER/CER by category (`werPerCategory`); `confusions` (reference/hypothesis
 * text pairs) yields global `topConfusions`. Both are additive — runs without
 * them keep the previous shape (fields absent, not null).
 *
 * @param {Array<{ id: string, category?: string, metrics?: ReturnType<typeof computeSttMetrics>, error?: string | null }>} results
 * @param {{ confusions?: Array<{ reference: string, hypothesis: string }> }} opts
 */
export function summarizeStt(results, { confusions = [] } = {}) {
  const measured = results.filter((r) => r.metrics && r.metrics.status === "medido")
  const fail = results.filter((r) => !r.metrics || r.metrics.emptyTranscript)

  const werSamples = measured
    .map((r) => r.metrics.wer)
    .filter((v) => Number.isFinite(v))
  const cerSamples = measured
    .map((r) => r.metrics.cer)
    .filter((v) => Number.isFinite(v))
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  const dropped = measured.reduce(
    (sum, r) => sum + (r.metrics.negation?.dropped ?? 0),
    0,
  )
  const added = measured.reduce((sum, r) => sum + (r.metrics.negation?.added ?? 0), 0)

  const werPerCase = Object.fromEntries(
    measured.map((r) => [r.id, r.metrics.wer]),
  )

  if (measured.length === 0) {
    return {
      status: "no_medido",
      reason: "No hay casos con transcripción STT medida en esta corrida.",
      evidence: "no_probado",
    }
  }

  // Group measured cases by category (those without one are omitted from the
  // category table; the global aggregates still cover them).
  const byCategory = new Map()
  for (const r of measured) {
    if (!r.category) continue
    if (!byCategory.has(r.category)) byCategory.set(r.category, [])
    byCategory.get(r.category).push(r)
  }
  const werPerCategory = Object.fromEntries(
    [...byCategory.keys()].map((category) => {
      const group = byCategory.get(category)
      const wers = group.map((r) => r.metrics.wer).filter((v) => Number.isFinite(v))
      const cers = group.map((r) => r.metrics.cer).filter((v) => Number.isFinite(v))
      return [
        category,
        {
          cases: group.length,
          meanWer: avg(wers),
          meanCer: avg(cers),
          werPerCase: Object.fromEntries(group.map((r) => [r.id, r.metrics.wer])),
        },
      ]
    }),
  )

  const topConfusions = confusions
    .filter((c) => typeof c.reference === "string" && typeof c.hypothesis === "string")
    .flatMap((c) => extractConfusions(c.reference, c.hypothesis))
    .reduce((acc, c) => {
      const key = `${c.ref}\t${c.hyp}`
      const existing = acc.find((entry) => `${entry.ref}\t${entry.hyp}` === key)
      if (existing) existing.count += c.count
      else acc.push({ ref: c.ref, hyp: c.hyp, count: c.count })
      return acc
    }, [])
    .sort((x, y) => y.count - x.count)
    .slice(0, 10)

  return {
    status: "medido",
    cases: measured.length,
    transcribeSuccessRate: ratio(measured.length - fail.length, measured.length),
    emptyTranscriptCount: fail.length,
    wer: { mean: avg(werSamples), min: mathMin(werSamples), max: mathMax(werSamples) },
    cer: { mean: avg(cerSamples) },
    meanWer: avg(werSamples),
    meanCer: avg(cerSamples),
    werPerCase,
    werPerCategory,
    topConfusions,
    negationDrops: dropped,
    negationAdds: added,
    evidence: "medido",
  }
}

function mathMin(xs) {
  return xs.length ? Math.min(...xs) : null
}
function mathMax(xs) {
  return xs.length ? Math.max(...xs) : null
}

export { editDistance as _editDistance, normalizeText as _normalizeText }