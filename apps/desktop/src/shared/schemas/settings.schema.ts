import { z } from "zod"
import { DEFAULT_IDLE_LOCK_MS } from "../constants/auth"

/** Q2 has not chosen a default STT constant; null means unset. */
export const settingsSchema = z
  .object({
    audioRetention: z.literal("until-note-approved"),
    transcriptRetention: z.union([
      z.literal("forever"),
      z.object({ unit: z.literal("days"), value: z.number().int().positive() }),
    ]),
    noteRetention: z.literal("forever"),
    sttModelId: z.string().min(1).nullable(),
    uiLocale: z.literal("es"),
    idleLockMs: z
      .number()
      .int()
      .min(60_000)
      .max(4 * 60 * 60 * 1000)
      .default(DEFAULT_IDLE_LOCK_MS),
  })
  .strict()

export type AppSettings = z.infer<typeof settingsSchema>

export const defaultSettings: AppSettings = {
  audioRetention: "until-note-approved",
  transcriptRetention: { unit: "days", value: 30 },
  noteRetention: "forever",
  sttModelId: null,
  uiLocale: "es",
  idleLockMs: DEFAULT_IDLE_LOCK_MS,
}

export function parseSettings(input: unknown): AppSettings {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error("Settings failed validation.")
  }
  return parsed.data
}
