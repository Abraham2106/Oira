import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import { containsNormalized, tokens } from "./text-utils"

const DESCARTA_NO_PATTERN =
  /(no\s+descarta|no\s+se\s+descarta|no\s+se\s+puede\s+descartar|no\s+excluye|no\s+se\s+excluye|no\s+descartamos|no\s+podemos\s+descartar)/i

/** EV-NEG-* — polaridad y alcance de la negación entre borrador y fuente. */

/**
 * Detecta inversión de negación: el borrador afirma positivamente lo que la
 * fuente niega ("descarta" vs "no descarta"). Bloqueo.
 */
export function detectNegationFlip(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // Si el borrador dice "descarta" (positivo) pero la fuente dice "no descarta", hay flip.
  const draftAffirms = containsNormalized(draftText, "descarta") && !DESCARTA_NO_PATTERN.test(draftText)
  if (!draftAffirms) return undefined
  const sourceNoDescarta = DESCARTA_NO_PATTERN.test(sourceText)
  if (sourceNoDescarta) {
    return {
      code: "NEGATION_FLIP",
      sectionId,
      message: "El borrador afirma lo que la fuente niega («descarta» vs «no descarta»).",
    }
  }
  return undefined
}

/**
 * Detecta que el borrador inventa una negación (convierte ausencia de mención
 * en una negación categórica). Advertencia (warning): el borrador niega sin que
 * la fuente lo respalde claramente.
 */
export function detectInventedNegation(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  const draftTokens = tokens(draftText)
  const hasDraftNegation = draftTokens.some((word) =>
    ["no", "nunca", "jamás", "niega", "negó", "sin"].includes(word),
  )
  if (!hasDraftNegation) return undefined
  // Si la fuente también niega, no hay invención.
  const sourceTokens = tokens(sourceText)
  const sourceNegates = sourceTokens.some((word) =>
    ["no", "nunca", "jamás", "niega", "negó", "sin"].includes(word),
  )
  if (sourceNegates) return undefined
  return {
    code: "INVENTED_NEGATION",
    sectionId,
    message: "El borrador incluye una negación que la fuente no sustenta.",
  }
}

/** EV-NEG-SCOPE: la negación del paciente no debe migrarse a otra afirmación. */
export function detectNegationScopeShift(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // Contraejemplo del plan: "no descarta herramientas diagnósticas" NO debe
  // marcarse como negación invertida. Esta regla detecta que el alcance de la
  // negación se expande (herramientas vs meningitis) cuando la fuente ya usa
  // "no descarta".
  const draftTokens = tokens(draftText)
  const hasScopeWord = draftTokens.some((w) => ["herramientas", "pruebas", "estudios", "exploraciones"].includes(w))
  if (!hasScopeWord) return undefined
  if (!DESCARTA_NO_PATTERN.test(draftText)) return undefined
  // Si ambos usan "no descarta" pero el alcance cambia, aviso (warning).
  if (containsNormalized(sourceText, "no") && DESCARTA_NO_PATTERN.test(sourceText)) {
    return {
      code: "NEGATION_SCOPE_SHIFT",
      sectionId,
      message: "La negación del borrador cambia el alcance respecto de la fuente.",
    }
  }
  return undefined
}