import { SECTION_IDS, SECTION_TITLES, type FieldPresence, type SectionId } from "@oira/types"
import { z } from "zod"

export const structuringSectionSchema = z.object({
  presence: z.enum(["STATED", "NOT_STATED", "UNKNOWN"]),
  text: z.string(),
  sourceSegmentIds: z.array(z.string()),
})

export const structuringOutputSchema = z.object({
  sections: z.record(z.enum(SECTION_IDS), structuringSectionSchema),
})

export type StructuringSection = z.infer<typeof structuringSectionSchema>
export type StructuringOutput = {
  sections: Partial<Record<SectionId, StructuringSection>>
}

export type StructuringValidation =
  | { ok: true; value: StructuringOutput }
  | { ok: false; issues: string[] }

function emptySection(): StructuringSection {
  return { presence: "NOT_STATED", text: "", sourceSegmentIds: [] }
}

function statedSection(text: string, sourceSegmentIds: string[] = []): StructuringSection {
  return { presence: "STATED", text, sourceSegmentIds }
}

function unknownSection(
  text: string,
  sourceSegmentIds: string[] = [],
): StructuringSection {
  return { presence: "UNKNOWN", text, sourceSegmentIds }
}

function lookupSectionId(key: string): SectionId | undefined {
  if ((SECTION_IDS as readonly string[]).includes(key)) return key as SectionId
  const lower = key.toLowerCase().trim()
  for (const id of SECTION_IDS) {
    if (id === lower) return id
    if (SECTION_TITLES[id].toLowerCase() === lower) return id
  }
  return undefined
}

function extractText(raw: unknown): string {
  if (raw == null) return ""
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw).trim()
  }
  if (Array.isArray(raw)) {
    return raw.map(extractText).filter(Boolean).join("\n")
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    for (const key of ["text", "content", "value", "narrative", "body", "nota"]) {
      const value = extractText(obj[key])
      if (value) return value
    }
  }
  return ""
}

function readPresence(raw: unknown): FieldPresence | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined
  const value = (raw as { presence?: unknown }).presence
  if (value === "STATED" || value === "NOT_STATED" || value === "UNKNOWN") return value
  return undefined
}

function asSection(raw: unknown, known: Set<string>): StructuringSection {
  const text = extractText(raw)
  let sourceSegmentIds: string[] = []
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const ids = (raw as { sourceSegmentIds?: unknown }).sourceSegmentIds
    if (Array.isArray(ids)) {
      sourceSegmentIds = ids.filter(
        (id): id is string => typeof id === "string" && known.has(id),
      )
    }
  }

  const presence = readPresence(raw)
  if (presence === "NOT_STATED") return emptySection()
  if (presence === "UNKNOWN") return unknownSection(text, sourceSegmentIds)
  if (presence === "STATED" || presence === undefined) {
    if (!text) return emptySection()
    return statedSection(text, sourceSegmentIds)
  }
  return emptySection()
}

function emptyNote(): StructuringOutput {
  return {
    sections: Object.fromEntries(SECTION_IDS.map((id) => [id, emptySection()])) as StructuringOutput["sections"],
  }
}

/** Temporary: never reject a draft for schema shape. Paste whatever JSON arrived. */
export function normalizeStructuringOutput(
  raw: unknown,
  knownSegmentIds: readonly string[] = [],
): StructuringOutput {
  const known = new Set(knownSegmentIds)
  const { sections } = emptyNote()

  if (typeof raw === "string" || typeof raw === "number") {
    const text = String(raw).trim()
    if (text) sections.clinical_narrative = statedSection(text)
    return { sections }
  }
  if (typeof raw !== "object" || raw === null) {
    return { sections }
  }

  const root = raw as Record<string, unknown>
  const nested = root.sections
  const bag: Record<string, unknown> =
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : Array.isArray(raw)
        ? {}
        : root

  const leftovers: string[] = []
  for (const [key, value] of Object.entries(bag)) {
    if (key === "sections") continue
    const id = lookupSectionId(key)
    if (id) {
      sections[id] = asSection(value, known)
      continue
    }
    const text = extractText(value)
    if (text) leftovers.push(`${key}: ${text}`)
  }

  if (!sections.clinical_narrative?.text.trim() && leftovers.length > 0) {
    sections.clinical_narrative = statedSection(leftovers.join("\n"))
  }

  return { sections }
}

export function validateStructuringOutput(
  raw: unknown,
  knownSegmentIds: readonly string[],
): StructuringValidation {
  return { ok: true, value: normalizeStructuringOutput(raw, knownSegmentIds) }
}

export function validateCompleteStructuringOutput(
  raw: unknown,
  knownSegmentIds: readonly string[],
): StructuringValidation {
  return { ok: true, value: normalizeStructuringOutput(raw, knownSegmentIds) }
}

export function parseModelJson(text: string): { ok: true; value: unknown } | { ok: false; issues: string[] } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, issues: ["La salida del modelo está vacía."] }
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? trimmed).trim()
  const candidates = [candidate]
  const objectStart = candidate.indexOf("{")
  const objectEnd = candidate.lastIndexOf("}")
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(candidate.slice(objectStart, objectEnd + 1))
  }
  for (const json of candidates) {
    try {
      return { ok: true, value: JSON.parse(json) }
    } catch {
      // Try the next representation, since SDK fields may contain wrappers.
    }
  }
  {
    const looksTruncated =
      !candidate.endsWith("}") ||
      (candidate.match(/\{/g) ?? []).length > (candidate.match(/\}/g) ?? []).length
    return {
      ok: false,
      issues: [
        looksTruncated
          ? "La salida JSON está incompleta o truncada."
          : "La salida no es JSON válido.",
      ],
    }
  }
}
