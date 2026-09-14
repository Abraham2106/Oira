import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import { containsNormalized, tokens } from "./text-utils"

/**
 * EV-CHUNK-* — detección de duplicados, conflictos entre chunks y autocorrecciones.
 * La última mención no invalida las anteriores automáticamente.
 */

export function detectDuplicateSections(
  sections: Array<{ id: SectionId; text: string }>,
): GenerationIssue[] {
  const issues: GenerationIssue[] = []
  const seen = new Map<string, number>()

  for (const section of sections) {
    const normalized = section.text.trim().toLowerCase()
    if (!normalized) continue
    const count = seen.get(normalized) || 0
    if (count > 0) {
      issues.push({
        code: "DUPLICATE_SECTION",
        sectionId: section.id,
        message: `La sección ${section.id} está duplicada (idéntica ${count + 1} veces).`,
      })
    }
    seen.set(normalized, count + 1)
  }
  return issues
}

export function detectCorrectionConflict(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // Detectar autocorrecciones donde el borrador cambia un dato
  const draftTokens = tokens(draftText)
  const sourceTokens = tokens(sourceText)

  // Buscar tokens numéricos que difieren entre borrador y fuente
  const draftNumbers = draftTokens.filter((t) => /^\d+$/.test(t))
  const sourceNumbers = sourceTokens.filter((t) => /^\d+$/.test(t))

  for (const num of draftNumbers) {
    if (!sourceNumbers.includes(num)) continue
    // El número existe en ambos textos; verificar si el contexto cambió
    // (simplificación: no marcamos si el contexto es diferente)
  }

  // Detectar si el borrador contiene "pero" o "sin embargo" que sugiere autocorrección
  if (containsNormalized(draftText, "pero en realidad") || containsNormalized(draftText, "sin embargo")) {
    // Si el borrador usa estos marcadores, puede haber una autocorrección
    // Esto es un warning, no un bloqueo
    return {
      code: "CHUNK_CORRECTION",
      sectionId,
      message: "El borrador contiene marcadores de autocorrección que pueden indicar cambio de dato.",
    }
  }

  return undefined
}

export function detectSelfContradiction(
  draftText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  // Verificar si el borrador se contradice internamente
  const sentences = draftText.split(/[.!?]+/).filter(Boolean)

  // Buscar afirmaciones negadas internamente
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const t1 = tokens(sentences[i])
      const t2 = tokens(sentences[j])

      // Verificar si una oración contiene "no" y la otra no
      const s1HasNo = t1.includes("no")
      const s2HasNo = t2.includes("no")

      // Una tiene "no", la otra no → posible contradicción
      if (s1HasNo === s2HasNo) continue

      // Extraer el tema principal (tokens filtrando "no", "sin")
      const theme1 = t1.filter((w) => w !== "no" && w !== "sin").join(" ")
      const theme2 = t2.filter((w) => w !== "no" && w !== "sin").join(" ")

      if (theme1 && theme2 && theme1 === theme2) {
        return {
          code: "SELF_CONTRADICTION",
          sectionId,
          message: `El borrador contiene afirmaciones contradictorias sobre "${theme1}".`,
        }
      }
    }
  }

  return undefined
}