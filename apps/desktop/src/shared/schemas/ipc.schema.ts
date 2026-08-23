import { z } from "zod"
import { clinicalNoteSchema } from "./clinical.schema"
import {
  getAuthSessionInputSchema,
  getSettingsInputSchema,
  googleSignInInputSchema,
  saveSettingsInputSchema,
  signOutInputSchema,
} from "./settings.schema"

export {
  getAuthSessionInputSchema,
  getSettingsInputSchema,
  googleSignInInputSchema,
  saveSettingsInputSchema,
  signOutInputSchema,
}

export const startEncounterInputSchema = z
  .object({
    label: z.string().optional(),
    visitType: z.string().optional(),
  })
  .strict()

export const stopEncounterInputSchema = z
  .object({
    encounterId: z.string().uuid(),
  })
  .strict()

export const appendAudioInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    sequence: z.number().int().nonnegative(),
    pcm: z.union([
      z.instanceof(Uint8Array),
      z.array(z.number().int().min(0).max(255)),
    ]),
  })
  .strict()

export const generateNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
  })
  .strict()

export const saveNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    note: clinicalNoteSchema,
  })
  .strict()

export const exportNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    format: z.enum(["txt", "json"]),
  })
  .strict()

export const clipboardWriteInputSchema = z
  .object({
    text: z.string().min(1).max(20_000),
  })
  .strict()

export const unlockInputSchema = z
  .object({
    pin: z.string().min(1),
  })
  .strict()

export const lockInputSchema = z.object({}).strict()

export type AppendAudioInput = z.infer<typeof appendAudioInputSchema>
export type StartEncounterInput = z.infer<typeof startEncounterInputSchema>
export type StopEncounterInput = z.infer<typeof stopEncounterInputSchema>
export type GenerateNoteInput = z.infer<typeof generateNoteInputSchema>
export type SaveNoteInput = z.infer<typeof saveNoteInputSchema>
export type ExportNoteInput = z.infer<typeof exportNoteInputSchema>
export type ClipboardWriteInput = z.infer<typeof clipboardWriteInputSchema>
export type UnlockInput = z.infer<typeof unlockInputSchema>
export type LockInput = z.infer<typeof lockInputSchema>
