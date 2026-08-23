import { z } from "zod"
import { LANGUAGE_VALUES } from "../constants/language"

/**
 * User settings contract (guide §2.16 / §8).
 * Persistence today is JSON via `main/config`; I05 must keep this schema
 * when the same rows move to SQLite — one Zod owner, two backends.
 */
export const settingsSchema = z.object({
  audioRetention: z.literal("until-note-approved"),
  transcriptRetention: z.union([
    z.literal("forever"),
    z.object({ unit: z.literal("days"), value: z.number().int().positive() }),
  ]),
  noteRetention: z.literal("forever"),
  /** Q2 has not chosen a default STT constant; null means unset. */
  sttModelId: z.string().min(1).nullable(),
  /** English-first product; persisted so the choice survives restarts. */
  uiLocale: z.enum(LANGUAGE_VALUES),
})

export type AppSettings = z.infer<typeof settingsSchema>

export const defaultSettings: AppSettings = {
  audioRetention: "until-note-approved",
  transcriptRetention: { unit: "days", value: 30 },
  noteRetention: "forever",
  sttModelId: null,
  uiLocale: "en",
}

export function parseSettings(input: unknown): AppSettings {
  return settingsSchema.parse(input)
}

export const languageSchema = z.enum(LANGUAGE_VALUES)

export const getSettingsInputSchema = z.object({}).strict()

export const saveSettingsInputSchema = z
  .object({
    uiLocale: languageSchema,
  })
  .strict()

export const googleSignInInputSchema = z.object({}).strict()

export const signOutInputSchema = z.object({}).strict()

export const getAuthSessionInputSchema = z.object({}).strict()
