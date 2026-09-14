/**
 * Extraction fidelity: scoring de sourceQuotes, mustNotInclude y soporte literal
 * de sourceSegmentIds. Puro (sin I/O). Etiquetado "Medido (match literal
 * normalizado, no semántico)" — el parafraseo del modelo vs la cita literal
 * produce falsos negativos (mismo límite que mustInclude).
 */

import { containsNormalized, normalizeText, ratio, SECTION_IDS } from "./index.mjs"

/**
 * Para cada sección que tiene sourceQuotes no vacío, cuenta cuántas quotes
 * están contenidas (normalizadas) en note.sections[id].text.
 * @param {object} gold - gold con sections[7].{ sourceQuotes }
 * @param {object|null} note - note con sections[7].text | null
 * @returns {{ bySection: Record<string,{total,found}>, aggregate: { total, found, recall } }}
 */
export function scoreQuoteCoverage(gold, note) {
  const bySection = {}
  let total = 0
  let found = 0
  for (const id of SECTION_IDS) {
    const quotes = gold?.sections?.[id]?.sourceQuotes
    if (!Array.isArray(quotes) || quotes.length === 0) continue
    const text = note?.sections?.[id]?.text ?? ""
    let f = 0
    for (const q of quotes) {
      if (containsNormalized(text, q)) f += 1
    }
    bySection[id] = { total: quotes.length, found: f }
    total += quotes.length
    found += f
  }
  return { bySection, aggregate: { total, found, recall: ratio(found, total) } }
}

/**
 * Para cada sección, lista los términos de gold.mustNotInclude presentes
 * (match normalizado) en el texto de esa sección del note.
 * @returns {{ bySection: Record<string,string[]>, all: string[], hasHit: boolean }}
 */
export function scoreMustNotInclude(gold, note) {
  const bySection = {}
  const all = []
  for (const id of SECTION_IDS) {
    const terms = gold?.sections?.[id]?.mustNotInclude
    if (!Array.isArray(terms) || terms.length === 0) continue
    const text = note?.sections?.[id]?.text ?? ""
    const hits = terms.filter((t) => containsNormalized(text, t))
    if (hits.length) {
      bySection[id] = hits
      all.push(...hits)
    }
  }
  return { bySection, all, hasHit: all.length > 0 }
}

/**
 * Para cada sección STATED con sourceSegmentIds no vacío: cuántos segmentos
 * citados existen en transcript y cuyo text (normalizado) está contenido en
 * el texto de la sección. Devuelve también la lista de STATED sin fuente
 * (mismo que evaluateCase, pero derivado aquí para composición en replay).
 *
 * @param {object|null} note
 * @param {object[]} transcript - segments con { id, text }
 * @returns {{ bySection: Record<string,{segments,found,supported}>, literalMissSections: string[], invalidIds: string[] }}
 */
export function scoreSourceSupport(note, transcript) {
  const segs = Array.isArray(transcript) ? transcript : []
  const byId = new Map(segs.map((s) => [s.id, normalizeText(s.text ?? "")]))
  const bySection = {}
  const literalMissSections = []
  const invalidIds = []
  if (!note) return { bySection, literalMissSections, invalidIds }
  for (const id of SECTION_IDS) {
    const field = note.sections?.[id]
    if (!field || field.presence !== "STATED") continue
    const ids = Array.isArray(field.sourceSegmentIds) ? field.sourceSegmentIds : []
    if (ids.length === 0) continue
    const t = normalizeText(field.text ?? "")
    let found = 0
    let supported = 0
    for (const sid of ids) {
      const st = byId.get(sid)
      if (st === undefined) {
        invalidIds.push(sid)
        continue
      }
      found += 1
      if (st && t && t.includes(st)) supported += 1
    }
    bySection[id] = { segments: ids.length, found, supported }
    if (supported < found) literalMissSections.push(id)
  }
  return { bySection, literalMissSections, invalidIds }
}
