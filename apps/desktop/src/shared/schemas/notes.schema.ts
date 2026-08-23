import { z } from "zod"
import { structuredClinicalFactsSchema } from "./clinical.schema"

export const draftNoteSchema = z
  .object({
    kind: z.literal("draft"),
    id: z.string().uuid(),
    encounterId: z.string().uuid(),
    facts: structuredClinicalFactsSchema,
    body: z.string(),
    model: z
      .object({
        name: z.string().min(1),
        promptVersion: z.string().min(1),
      })
      .strict(),
    generatedAt: z.string().min(1),
  })
  .strict()

export const approvedNoteSchema = z
  .object({
    kind: z.literal("approved"),
    id: z.string().uuid(),
    encounterId: z.string().uuid(),
    body: z.string().min(1),
    approvedBy: z.literal("local-user"),
    approvedAt: z.string().min(1),
    derivedFromDraftId: z.string().uuid(),
  })
  .strict()
