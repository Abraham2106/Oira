import { z } from "zod"
import { ENCOUNTER_STATUSES } from "../constants/encounter-status"
import { draftNoteSchema } from "./notes.schema"

/** MVP: only one encounter may be recording or transcribing. startEncounter composes create()+start() and fails with ENCOUNTER_ACTIVE if another is active. */
export const startEncounterInputSchema = z.object({}).strict()

export const stopEncounterInputSchema = z
  .object({
    encounterId: z.string().uuid(),
  })
  .strict()

export const getEncounterInputSchema = stopEncounterInputSchema

export const discardEncounterInputSchema = stopEncounterInputSchema

export const cancelTranscriptionInputSchema = stopEncounterInputSchema

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
    format: z.enum(["txt", "json", "clipboard"]),
  })
  .strict()

export const unlockInputSchema = z
  .object({
    pin: z.string().min(4).max(64),
  })
  .strict()

export const setPinInputSchema = unlockInputSchema

export const lockInputSchema = z.object({}).strict()

export const authStatusInputSchema = z.object({}).strict()

export const pushAudioChunkInputSchema = z
  .object({
    encounterId: z.string().uuid(),
    chunk: z.custom<Uint8Array>((value) => value instanceof Uint8Array),
  })
  .strict()

export const startEncounterOutputSchema = z
  .object({
    encounterId: z.string().uuid(),
  })
  .strict()

export const encounterStatusOutputSchema = z
  .object({
    status: z.enum(ENCOUNTER_STATUSES),
  })
  .strict()

export const getEncounterOutputSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(ENCOUNTER_STATUSES),
    createdAt: z.string().min(1),
    startedAt: z.string().nullable(),
    endedAt: z.string().nullable(),
    updatedAt: z.string().min(1),
    completedAt: z.string().nullable(),
    transcriptId: z.string().uuid().nullable(),
  })
  .strict()

export const pushAudioChunkOutputSchema = z.void()

export const generateNoteOutputSchema = z
  .object({
    draft: draftNoteSchema,
  })
  .strict()

export const saveNoteOutputSchema = z
  .object({
    noteId: z.string().uuid(),
  })
  .strict()

export const exportNoteOutputSchema = z
  .object({
    exported: z.literal(true),
  })
  .strict()

export const authStatusOutputSchema = z
  .object({
    hasPin: z.boolean(),
    authenticated: z.boolean(),
  })
  .strict()

export const setPinOutputSchema = z.object({ set: z.literal(true) }).strict()

export const unlockOutputSchema = z.object({ unlocked: z.literal(true) }).strict()

export const lockOutputSchema = z.object({ locked: z.literal(true) }).strict()

export const storageInventoryInputSchema = z.object({}).strict()

export const storageInventoryOutputSchema = z
  .object({
    encounters: z.number().int().nonnegative(),
    transcripts: z.number().int().nonnegative(),
    notes: z.number().int().nonnegative(),
    audioDirs: z.number().int().nonnegative(),
  })
  .strict()

export type StartEncounterInput = z.infer<typeof startEncounterInputSchema>
export type StopEncounterInput = z.infer<typeof stopEncounterInputSchema>
export type GetEncounterInput = z.infer<typeof getEncounterInputSchema>
export type DiscardEncounterInput = z.infer<typeof discardEncounterInputSchema>
export type CancelTranscriptionInput = z.infer<typeof cancelTranscriptionInputSchema>
export type GenerateNoteInput = z.infer<typeof generateNoteInputSchema>
export type SaveNoteInput = z.infer<typeof saveNoteInputSchema>
export type ExportNoteInput = z.infer<typeof exportNoteInputSchema>
export type UnlockInput = z.infer<typeof unlockInputSchema>
export type SetPinInput = z.infer<typeof setPinInputSchema>
export type LockInput = z.infer<typeof lockInputSchema>
export type AuthStatusInput = z.infer<typeof authStatusInputSchema>
export type PushAudioChunkInput = z.infer<typeof pushAudioChunkInputSchema>
