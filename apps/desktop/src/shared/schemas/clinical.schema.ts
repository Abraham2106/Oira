import { z } from "zod"
import { SECTION_IDS } from "@oira/types"

export const fieldValueSchema = z
  .object({
    text: z.string(),
    presence: z.enum(["STATED", "NOT_STATED", "UNKNOWN"]),
    sourceSegmentIds: z.array(z.string()),
    provenance: z.enum(["EXTRACTED", "CLINICIAN_EDITED"]),
    reviewed: z.boolean(),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (
      field.provenance === "EXTRACTED" &&
      field.presence === "STATED" &&
      field.sourceSegmentIds.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Extracted stated fields require source segments.",
      })
    }
  })

export const transcriptSegmentSchema = z
  .object({
    id: z.string().min(1),
    speaker: z.enum(["Médico", "Paciente"]).nullable(),
    startMs: z.number().int().nonnegative(),
    text: z.string(),
  })
  .strict()

export const clinicalNoteSchema = z
  .object({
    sections: z
      .object({
        visit_context: fieldValueSchema,
        clinical_narrative: fieldValueSchema,
        relevant_history: fieldValueSchema,
        reported_findings: fieldValueSchema,
        clinician_documented_assessment: fieldValueSchema,
        clinician_documented_plan: fieldValueSchema,
        follow_up: fieldValueSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((note, ctx) => {
    const keys = Object.keys(note.sections)
    if (keys.length !== SECTION_IDS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clinical note must include all I4 sections.",
      })
    }
  })
