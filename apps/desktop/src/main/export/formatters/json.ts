import { z } from "zod"
import { structuredClinicalFactsSchema } from "../../../shared/schemas/clinical.schema"
import { approvedNoteSchema } from "../../../shared/schemas/notes.schema"
import type { ApprovedNote } from "../../../shared/types/notes"
import type { StructuredClinicalFacts } from "../../../shared/schemas/clinical.schema"

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

export function formatNoteJson(input: {
  note: ApprovedNote
  facts: StructuredClinicalFacts | null
  model: { name: string | null; promptVersion: string | null }
}): string {
  const parsed = exportJsonPayloadSchema.parse(input)
  return `${JSON.stringify(parsed, null, 2)}\n`
}
