import { z } from "zod"

/**
 * No fields yet: the encounters table (guide §8.2) has no label/visit_type,
 * so accepting them would drop them silently. Add them here and to the record
 * in the same change once persistence exists.
 */
export const startEncounterInputSchema = z.object({}).strict()

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
