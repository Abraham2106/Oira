import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"

const DOSE_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|g|ml|cm|mm|kg|l|mcg|µg|ui|unidades?|h|min|semanas?|meses?|años?|dias?|días?)\b/gi

function extractDoses(text: string): string[] {
  const found: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(DOSE_PATTERN.source, "gi")
  while ((match = re.exec(text)) !== null) {
    found.push(match[0].trim().toLowerCase())
  }
  return found
}

/** EV-NUM-* — verificación de cifras y unidades entre borrador y fuente. */

/**
 * EV-NUM-CITE: el borrador menciona una dosis que no aparece literalmente en la fuente.
 * Advertencia (warning). No marca equivalencias ni unidades idénticas.
 */
export function verifyMeasurementCitation(
  sectionId: SectionId | undefined,
  sectionText: string,
  sourceText: string,
): GenerationIssue | undefined {
  const doses = extractDoses(sectionText)
  for (const dose of doses) {
    if (!sourceText.toLowerCase().includes(dose.toLowerCase())) {
      // El borrador introduce una cifra que la fuente no contiene literalmente:
      // invención potencial. (Una conversión equivalente legítima usa otra
      // cifra y no debe matchear aquí.)
      return {
        code: "UNKNOWN_SOURCE",
        sectionId,
        message: `La dosis "${dose}" no aparece literalmente en la fuente.`,
      }
    }
  }
  return undefined
}

/**
 * EV-NUM-UNIT: misma cifra, unidad distinta (p. ej. 2 mg vs 2 g). Bloqueo.
 */
export function verifyUnitConsistency(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue[] {
  const issues: GenerationIssue[] = []
  const draft = extractDoses(draftText)
  const source = extractDoses(sourceText)
  const sourceByNumber = new Map<string, string[]>()
  for (const item of source) {
    const num = item.split(/[a-zµ]/i)[0].trim()
    const entry = sourceByNumber.get(num)
    if (entry) entry.push(item)
    else sourceByNumber.set(num, [item])
  }
  for (const item of draft) {
    const num = item.split(/[a-zµ]/i)[0].trim()
    const sourceVariants = sourceByNumber.get(num)
    if (!sourceVariants) continue
    if (!sourceVariants.includes(item)) {
      issues.push({
        code: "UNIT_MISMATCH",
        sectionId,
        message: `La medición "${item}" del borrador no coincide con "${sourceVariants.join(" / ")}" de la fuente.`,
      })
    }
  }
  return issues
}
