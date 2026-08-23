/** Drug names and dose fragments for Whisper biasing and plan buckets. No diagnoses. */
export const CLINICAL_DRUGS = [
  "ibuprofeno",
  "paracetamol",
  "omeprazol",
  "amoxicilina",
  "enalapril",
  "metformina",
  "salbutamol",
] as const

export const DOSE_FRAGMENTS = ["miligramos", "cada 8 horas"] as const

/** STT misspellings we still treat as plan evidence; never invent the canonical name. */
export const PLAN_STT_VARIANTS = ["profeno"] as const

export const PLAN_CUES = ["recomiendo", "pastillas", "pastilla"] as const

/**
 * Regex fragments joined into HISTORY_RE (not a plain string list).
 * Exact: gastritis, diabetes
 * Accent/flex: hipertensi[oó]n, asm[aá], alergias?, alérgic*, hipotiroid*, cirugías?
 */
export const HISTORY_CONDITIONS = [
  "gastritis",
  "hipertensi[oó]n",
  "diabetes",
  "asm[aá]",
  "alergias?",
  "al[eé]rgic\\w*",
  "hipotiroid\\w*",
  "cirug[ií]as?",
] as const

/** Confirmed on whisperConfigSchema in @qvac/sdk 0.17.1. Vocabulary only — Q7. */
export const WHISPER_INITIAL_PROMPT = [...CLINICAL_DRUGS, ...DOSE_FRAGMENTS].join(", ")

export function historyTermPattern(): string {
  return HISTORY_CONDITIONS.join("|")
}

export function planTermPattern(): string {
  return [...PLAN_CUES, ...CLINICAL_DRUGS, ...PLAN_STT_VARIANTS, "miligramos?", "\\d+\\s*mg"].join(
    "|",
  )
}
