import type { SectionId } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import { tokens } from "./text-utils"

const PATIENT_SELF = ["yo", "mi", "me", "mí", "paciente", "el paciente", "la paciente"]
const FAMILY_KEYWORDS = [
  "padre", "madre", "hermano", "hermana", "hijo", "hija",
  "abuelo", "abuela", "tío", "tía", "primo", "prima",
  "familiar", "familia", "antecedente familiar", "heredado",
]
const PAST_TENSE_ES = [
  "tuve", "tuvo", "padeci", "padecio", "estuve", "estuvo",
  "fue", "era", "habia", "hubo", "tome", "tuve que",
  "me operaron", "me opere", "operaron", "opere",
]
const PRESENT_TENSE_ES = [
  "tengo", "tiene", "padezco", "padece", "estoy", "esta",
  "hay", "toma", "me duele", "le duele",
]

/** EV-SUBJ-* — sujeto y temporalidad entre borrador y fuente. */

function subjectOfSentence(sentence: string): "patient" | "family" | "unknown" {
  const t = tokens(sentence)
  const hasFamily = t.some((w) => FAMILY_KEYWORDS.includes(w))
  const hasPatient = t.some((w) => PATIENT_SELF.includes(w))
  if (hasFamily && !hasPatient) return "family"
  if (hasPatient && !hasFamily) return "patient"
  return "unknown"
}

/** Verifica si el texto contiene la palabra completa (no subcadena). */
function containsWord(text: string, word: string): boolean {
  const t = tokens(text)
  return t.includes(word.toLowerCase())
}

export function detectSubjectShift(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  const draftSubject = subjectOfSentence(draftText)
  const sourceSubject = subjectOfSentence(sourceText)
  if (draftSubject === "patient" && sourceSubject === "family") {
    return {
      code: "SUBJECT_SHIFT",
      sectionId,
      message: "El borrador atribuye al paciente un antecedente que la fuente asigna a un familiar.",
    }
  }
  return undefined
}

export function detectTenseShift(
  draftText: string,
  sourceText: string,
  sectionId: SectionId | undefined,
): GenerationIssue | undefined {
  const draftPast = PAST_TENSE_ES.some((v) => containsWord(draftText, v))
  const draftPresent = PRESENT_TENSE_ES.some((v) => containsWord(draftText, v))
  const sourcePast = PAST_TENSE_ES.some((v) => containsWord(sourceText, v))
  const sourcePresent = PRESENT_TENSE_ES.some((v) => containsWord(sourceText, v))

  // Borrador en presente, fuente en pasado → el borrador actualiza un antecedente resuelto
  if (draftPresent && sourcePast && !draftPast) {
    return {
      code: "TENSE_SHIFT",
      sectionId,
      message: "El borrador presenta en presente un hecho que la fuente sitúa en pasado.",
    }
  }
  // Borrador en pasado, fuente en presente → el borrador da por cerrado algo activo
  if (draftPast && sourcePresent && !draftPresent) {
    return {
      code: "TENSE_SHIFT",
      sectionId,
      message: "El borrador sitúa en pasado un hecho que la fuente describe en presente.",
    }
  }
  return undefined
}