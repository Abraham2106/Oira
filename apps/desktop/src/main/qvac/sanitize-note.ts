import { SECTION_IDS, type ClinicalNote, type FieldValue, type SectionId } from "@notalocal/types"
import { historyTermPattern, planTermPattern } from "./clinical-vocab"

const EMPTY: FieldValue = {
  text: "",
  presence: "NOT_STATED",
  sourceSegmentIds: [],
  reviewed: false,
}

const PRIMARY_SECTIONS: SectionId[] = ["visit_context", "clinical_narrative"]

type TranscriptBit = { id: string; text: string }

const HISTORY_RE = new RegExp(`\\b(${historyTermPattern()})\\b`, "i")
const PLAN_RE = new RegExp(`\\b(${planTermPattern()})\\b`, "i")
const INJECTION_RE = /ignora\w*\s+las instrucciones|\bdiagnostica\b/i
const NEGATION_RE =
  /\b(no|nunca|tampoco|sin|descart\w*|niega|niego|negamos|negativo|negativa)\b/i

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ")
}

function emptyField(): FieldValue {
  return { ...EMPTY }
}

function statedField(text: string, sourceSegmentIds: string[]): FieldValue {
  return {
    text,
    presence: "STATED",
    sourceSegmentIds,
    reviewed: false,
  }
}

function allowedSources(ids: string[], allowedIds: Set<string>): string[] {
  return ids.filter((id) => allowedIds.has(id))
}

function isInjection(text: string): boolean {
  return INJECTION_RE.test(text)
}

function isHistory(text: string): boolean {
  if (isInjection(text)) return false
  HISTORY_RE.lastIndex = 0
  const match = HISTORY_RE.exec(text)
  if (!match || match.index == null) return false
  // 48-char lookbehind: "descartamos gastritis" is not history.
  // Conservative miss: "no … pero sí tiene gastritis" in that window also suppresses.
  const before = text.slice(Math.max(0, match.index - 48), match.index)
  return !NEGATION_RE.test(before)
}

function isPlan(text: string): boolean {
  return !isInjection(text) && PLAN_RE.test(text)
}

function similar(left: string, right: string): boolean {
  const a = normalize(left)
  const b = normalize(right)
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

function joinBits(
  bits: TranscriptBit[],
  allowedIds: Set<string>,
): FieldValue {
  if (bits.length === 0) return emptyField()
  return statedField(
    bits.map((bit) => bit.text.trim()).join(" "),
    allowedSources(
      bits.map((bit) => bit.id),
      allowedIds,
    ),
  )
}

/**
 * Rebuild visit/narrative from transcript order when Qwen dumped them.
 * Limit: first remaining other-bit → visit_context, the rest → clinical_narrative
 * (assumes the consult is roughly motivo then relato).
 */
function shouldRebuildPrimaries(
  sections: ClinicalNote["sections"],
  usable: TranscriptBit[],
): boolean {
  if (usable.length < 2) return false
  if (similar(sections.visit_context.text, sections.clinical_narrative.text)) {
    return true
  }
  return sections.visit_context.sourceSegmentIds.length >= 3
}

function applyTranscriptBuckets(
  sections: ClinicalNote["sections"],
  allowedIds: Set<string>,
  segments?: TranscriptBit[],
): ClinicalNote {
  const usable = (segments ?? [])
    .map((segment) => ({ id: segment.id, text: segment.text.trim() }))
    .filter((segment) => segment.text.length > 0)
  if (usable.length === 0) return { sections }

  const historyBits = usable.filter((segment) => isHistory(segment.text))
  const planBits = usable.filter((segment) => isPlan(segment.text))
  const otherBits = usable.filter(
    (segment) => !isHistory(segment.text) && !isPlan(segment.text),
  )

  const next = { ...sections }
  if (shouldRebuildPrimaries(sections, usable) && otherBits.length > 0) {
    const [first, ...rest] = otherBits
    next.visit_context = joinBits([first], allowedIds)
    next.clinical_narrative = joinBits(rest, allowedIds)
  }
  if (!next.relevant_history.text && historyBits.length > 0) {
    next.relevant_history = joinBits(historyBits, allowedIds)
  }
  if (!next.clinician_documented_plan.text && planBits.length > 0) {
    next.clinician_documented_plan = joinBits(planBits, allowedIds)
  }
  return { sections: next }
}

/** Collapse small-model dumps and recover history/plan from explicit transcript spans. */
export function sanitizeQwenNote(
  note: ClinicalNote,
  allowedIds: Set<string>,
  segments?: TranscriptBit[],
): ClinicalNote {
  const cleaned = {} as ClinicalNote["sections"]
  for (const id of SECTION_IDS) {
    const field = note.sections[id]
    const text = field.text.trim()
    const sources = field.sourceSegmentIds.filter((sourceId) => allowedIds.has(sourceId))
    if (!text) {
      cleaned[id] = emptyField()
      continue
    }
    cleaned[id] = {
      text,
      presence: field.presence === "UNKNOWN" ? "UNKNOWN" : "STATED",
      sourceSegmentIds: sources,
      reviewed: false,
    }
  }

  const primaryKeys = new Set(
    PRIMARY_SECTIONS.map((id) => normalize(cleaned[id].text)).filter(Boolean),
  )
  const combo = normalize(
    `${cleaned.visit_context.text} ${cleaned.clinical_narrative.text}`,
  )
  for (const id of SECTION_IDS) {
    if (PRIMARY_SECTIONS.includes(id)) continue
    const key = normalize(cleaned[id].text)
    if (key && (primaryKeys.has(key) || key === combo)) {
      cleaned[id] = emptyField()
    }
  }

  const filled = SECTION_IDS.filter((id) => cleaned[id].text.length > 0)
  if (filled.length < 3) {
    return applyTranscriptBuckets(cleaned, allowedIds, segments)
  }

  const counts = new Map<string, number>()
  for (const id of filled) {
    const key = normalize(cleaned[id].text)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const dumped = [...counts.entries()].find(([, count]) => count >= 3)
  if (!dumped) {
    return applyTranscriptBuckets(cleaned, allowedIds, segments)
  }

  const dumpKey = dumped[0]
  const sections = {} as ClinicalNote["sections"]
  for (const id of SECTION_IDS) {
    const field = cleaned[id]
    if (normalize(field.text) !== dumpKey) {
      sections[id] = field
      continue
    }
    sections[id] = PRIMARY_SECTIONS.includes(id)
      ? statedField(field.text, field.sourceSegmentIds)
      : emptyField()
  }
  return applyTranscriptBuckets(sections, allowedIds, segments)
}
