import { z } from "zod"
import { APP_ERROR_CODES } from "../constants/app-error-codes"
import { ENCOUNTER_STATUSES } from "../constants/encounter-status"
import { TRANSCRIPTION_JOB_STATUSES } from "../constants/transcription-status"

/** Progress only. Never include transcript text or note body. */
export const transcriptionProgressEventSchema = z
  .object({
    type: z.literal("transcription.progress"),
    encounterId: z.string().uuid(),
    status: z.enum(TRANSCRIPTION_JOB_STATUSES),
  })
  .strict()

export const encounterStatusEventSchema = z
  .object({
    type: z.literal("encounter.status"),
    encounterId: z.string().uuid(),
    status: z.enum(ENCOUNTER_STATUSES),
  })
  .strict()

export const modelDownloadProgressEventSchema = z
  .object({
    type: z.literal("model.download.progress"),
    role: z.enum(["stt", "structuring"]),
    percent: z.number().min(0).max(100),
  })
  .strict()

export const appErrorEventSchema = z
  .object({
    type: z.literal("error"),
    code: z.enum(APP_ERROR_CODES),
  })
  .strict()

export const rendererEventSchema = z.discriminatedUnion("type", [
  transcriptionProgressEventSchema,
  encounterStatusEventSchema,
  modelDownloadProgressEventSchema,
  appErrorEventSchema,
])

export type TranscriptionProgressEvent = z.infer<
  typeof transcriptionProgressEventSchema
>
export type EncounterStatusEvent = z.infer<typeof encounterStatusEventSchema>
export type ModelDownloadProgressEvent = z.infer<
  typeof modelDownloadProgressEventSchema
>
export type AppErrorEvent = z.infer<typeof appErrorEventSchema>
export type RendererEvent = z.infer<typeof rendererEventSchema>
