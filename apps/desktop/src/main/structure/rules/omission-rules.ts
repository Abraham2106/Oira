import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import { tokens } from "./text-utils"

/**
 * EV-OMIS-* — hechos relevantes de la fuente ausentes del borrador.
 *
 * En producción se usa una lista de desencadenantes por sección.
 * Para eval se compara con reference.json (gold).
 * Esta implementación básica verifica keywords críticos por sección.
 */

const CRITICAL_KEYWORDS_BY_SECTION: Record<SectionId, string[]> = {
  relevant_history: ["alergia", "alérgico", "alérgica", "intolerancia", "reacción adversa", "antecedente", "enfermedad", "cirugía", "hospitalización", "tratamiento"],
  reported_findings: ["dolor", "molestia", "fiebre", "náusea", "vómito", "diarrea", "tos", "disnea"],
  clinician_documented_assessment: ["diagnóstico", "impresión", "hipótesis", "sospecha", "cuadro"],
  clinician_documented_plan: ["tratamiento", "indicación", "prescripción", "seguimiento", "control"],
  visit_context: ["motivo", "consulta"],
  clinical_narrative: [],
  follow_up: ["seguimiento", "cita"],
}

/** Mapa de variantes morfológicas para evitar falsos positivos. */
const KEYWORD_VARIANTS: Record<string, string[]> = {
  alergia: ["alergia", "alérgico", "alérgica", "alergico", "alergica"],
  alérgico: ["alergia", "alérgico", "alérgica", "alergico", "alergica"],
  alérgica: ["alergia", "alérgico", "alérgica", "alergico", "alergica"],
  intolerancia: ["intolerancia"],
  "reacción adversa": ["reacción adversa", "reaccion adversa"],
  dolor: ["dolor"],
  molestia: ["molestia"],
  fiebre: ["fiebre"],
  náusea: ["náusea", "nausea"],
  vómito: ["vómito", "vomito"],
  diarrea: ["diarrea"],
  tos: ["tos"],
  disnea: ["disnea"],
  antecedente: ["antecedente"],
  enfermedad: ["enfermedad"],
  cirugía: ["cirugía", "cirugia"],
  hospitalización: ["hospitalización", "hospitalizacion"],
  tratamiento: ["tratamiento"],
  diagnóstico: ["diagnóstico", "diagnostico"],
  impresión: ["impresión", "impresion"],
  hipótesis: ["hipótesis", "hipotesis"],
  sospecha: ["sospecha"],
  cuadro: ["cuadro"],
  indicación: ["indicación", "indicacion"],
  prescripción: ["prescripción", "prescripcion"],
  seguimiento: ["seguimiento"],
  control: ["control"],
  exploración: ["exploración", "exploracion"],
  signo: ["signo"],
  hallazgo: ["hallazgo"],
  inspección: ["inspección", "inspeccion"],
  palpación: ["palpación", "palpacion"],
  auscultación: ["auscultación", "auscultacion"],
}

import { normalizeText } from "./text-utils"

/** Verifica si el texto contiene la palabra completa (no subcadena). */
function containsWord(text: string, word: string): boolean {
  const t = tokens(text)
  const normalizedWord = normalizeText(word)
  return t.includes(normalizedWord)
}

export function detectCriticalOmission(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  if (!sectionId) return undefined
  const keywords = CRITICAL_KEYWORDS_BY_SECTION[sectionId]
  if (!keywords || keywords.length === 0) return undefined

  for (const kw of keywords) {
    if (containsWord(sourceText, kw)) {
      // Verificar si alguna variante del keyword está en el borrador
      const variants = KEYWORD_VARIANTS[kw] || [kw]
      const hasVariant = variants.some((v) => containsWord(draftText, v))
      if (!hasVariant) {
        return {
          code: "OMISSION",
          sectionId,
          message: `La fuente menciona "${kw}" pero el borrador lo omite en esta sección.`,
        }
      }
    }
  }
  return undefined
}

export function detectContradictionBetweenChunks(
  chunkTexts: string[],
  sectionId: SectionId | undefined,
): GenerationIssue[] {
  const issues: GenerationIssue[] = []
  const texts = chunkTexts.filter(Boolean)

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const t1 = tokens(texts[i])
      const t2 = tokens(texts[j])

      // Verificar si ambos chunks tienen afirmaciones contradictorias sobre el mismo tema
      // Simplificación: buscar pares positivos/negativos del mismo token
      for (const tok of t1) {
        const hasNeg = t2.includes(`${tok}`) && t2.some((w) => w === "no" || w === "sin")
        if (hasNeg && t1.some((w) => w === "no" || w === "sin")) {
          continue // Ambos niegan
        }
        if (hasNeg && !t1.some((w) => w === "no" || w === "sin")) {
          issues.push({
            code: "CHUNK_CONTRADICTION",
            sectionId,
            message: `Contradicción entre chunks: "${texts[i].slice(0, 60)}..." vs "${texts[j].slice(0, 60)}...".`,
          })
          break
        }
      }
    }
  }
  return issues
}