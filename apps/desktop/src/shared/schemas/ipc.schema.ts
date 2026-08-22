import { z } from "zod"

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

export const generateNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
  })
  .strict()

export const saveNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    body: z.string().min(1),
  })
  .strict()

export const exportNoteInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    format: z.enum(["txt", "json"]),
  })
  .strict()

export const unlockInputSchema = z
  .object({
    pin: z.string().min(1),
  })
  .strict()

export const lockInputSchema = z.object({}).strict()

export type StartEncounterInput = z.infer<typeof startEncounterInputSchema>
export type StopEncounterInput = z.infer<typeof stopEncounterInputSchema>
export type GenerateNoteInput = z.infer<typeof generateNoteInputSchema>
export type SaveNoteInput = z.infer<typeof saveNoteInputSchema>
export type ExportNoteInput = z.infer<typeof exportNoteInputSchema>
export type UnlockInput = z.infer<typeof unlockInputSchema>
export type LockInput = z.infer<typeof lockInputSchema>
