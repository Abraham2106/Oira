import { SECTION_IDS, SECTION_TITLES, type FieldPresence, type SectionId } from "@oira/types"
import { z } from "zod"
import type { GenerationIssue } from "./generation-errors"

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

export type StrictStructuringValidation =
  | { ok: true; value: StructuringOutput; issues: [] }
  | { ok: false; issues: GenerationIssue[] }

/**
 * Contracto estricto del Nivel 2 de NOTE_VERIFIER_P3 (generador QVAC).
 * Opera sobre la salida cruda parseada del modelo. Rechaza formas que la
 * normalización permisiva aceptaría; los reintentos del runner consumen
 * `issues[]` (con código estable) como feedback. La paráfrasis semántica NO
 * se evalúa aquí (eso es heurísticas/revisor): solo estructura y contrato.
 */
export function validateCompleteStructuringOutput(
  raw: unknown,
  knownSegmentIds: readonly string[],
): StrictStructuringValidation {
  const known = new Set(knownSegmentIds)
  const issues: GenerationIssue[] = []

  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: "EMPTY_OUTPUT", message: "La salida no es un objeto JSON." }] }
  }
  const root = raw as Record<string, unknown>
  const nested = root.sections
  const bag: Record<string, unknown> =
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : root

  const present = new Set<string>()
  for (const [key, value] of Object.entries(bag)) {
    if (key === "sections") continue
    const id = lookupSectionId(key)
    if (!id) continue
    present.add(id)
    const presence = readPresence(value)
    if (presence === undefined) {
      if (typeof value === "string") {
        // Forma plana ("sectionId": "texto") — tolerada: normalize la convierte
        // a STATED. El modelo con json_schema no debería emitirla.
        continue
      }
      issues.push({
        code: "INVALID_PRESENCE",
        sectionId: id,
        message: `La sección ${id} no tiene presence válido (STATED | NOT_STATED | UNKNOWN).`,
      })
      continue
    }
    const text = extractText(value)
    const ids =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? Array.isArray((value as { sourceSegmentIds?: unknown }).sourceSegmentIds)
          ? ((value as { sourceSegmentIds: unknown[] }).sourceSegmentIds).filter(
              (candidate): candidate is string => typeof candidate === "string",
            )
          : []
        : []
    if (presence === "STATED" && !text.trim()) {
      issues.push({
        code: "STATED_WITHOUT_TEXT",
        sectionId: id,
        message: `La sección ${id} es STATED pero su text está vacío.`,
      })
    }
    if (presence === "NOT_STATED" && (text.trim() || ids.length > 0)) {
      issues.push({
        code: "NOT_STATED_WITH_TEXT",
        sectionId: id,
        message: `La sección ${id} es NOT_STATED pero contiene text o sourceSegmentIds; debe ser "" y [].`,
      })
    }
    for (const segmentId of ids) {
      if (!known.has(segmentId)) {
        issues.push({
          code: "INVALID_SOURCE_ID",
          sectionId: id,
          message: `La sección ${id} cita el segmento "${segmentId}" que no existe en la transcripción.`,
        })
      }
    }
  }

  for (const id of SECTION_IDS) {
    if (!present.has(id)) {
      issues.push({
        code: "MISSING_SECTION",
        sectionId: id,
        message: `Falta la sección ${id}(s) del JSON.`,
      })
    }
  }

  // Un chunk pequeño o vacío puede legítimamente estar todo NOT_STATED; pero
  // si el JSON no trajo ni una sección reconocible, no hay borrador útil.
  if (present.size === 0) {
    issues.push({ code: "EMPTY_OUTPUT", message: "No se reconoció ninguna sección en el JSON." })
  }

  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, value: normalizeStructuringOutput(raw, knownSegmentIds), issues: [] }
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
