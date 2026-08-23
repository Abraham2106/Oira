import { z } from "zod"

/** Each fact is optional; absent means not stated. Never fill invented defaults. */
export const clinicalFactSchema = z
  .object({
    text: z.string().min(1).optional(),
    sourceSegmentIds: z.array(z.string().min(1)).optional(),
  })
  .strict()

/**
 * Shape owned by the IA role; this is a permissive placeholder so Main can
 * enforce "model output must parse" before persistence.
 */
export const structuredClinicalFactsSchema = z
  .object({
    visitContext: clinicalFactSchema.optional(),
    clinicalNarrative: clinicalFactSchema.optional(),
    relevantHistory: clinicalFactSchema.optional(),
    reportedFindings: clinicalFactSchema.optional(),
    assessment: clinicalFactSchema.optional(),
    plan: clinicalFactSchema.optional(),
    followUp: clinicalFactSchema.optional(),
  })
  .strict()

export type ClinicalFact = z.infer<typeof clinicalFactSchema>
export type StructuredClinicalFacts = z.infer<typeof structuredClinicalFactsSchema>
