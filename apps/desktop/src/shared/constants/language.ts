export const LANGUAGE_VALUES = ["en", "es"] as const

export type Language = (typeof LANGUAGE_VALUES)[number]

/** The app is English-first. */
export const DEFAULT_LANGUAGE: Language = "en"
