import { z } from "zod"
import { structuredClinicalFactsSchema } from "./clinical.schema"
import { approvedNoteSchema } from "./notes.schema"

export const exportJsonPayloadSchema = z
  .object({
    note: approvedNoteSchema,
    facts: structuredClinicalFactsSchema.nullable(),
    model: z
      .object({
        name: z.string().nullable(),
        promptVersion: z.string().nullable(),
      })
      .strict(),
  })
  .strict()

export type ExportJsonPayload = z.infer<typeof exportJsonPayloadSchema>
