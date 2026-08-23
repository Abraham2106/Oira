import { z } from "zod"
import { SECTION_IDS, type SectionId } from "@oira/types"

export const structuringSectionSchema = z.object({
  presence: z.enum(["STATED", "NOT_STATED", "UNKNOWN"]),
  text: z.string(),
  sourceSegmentIds: z.array(z.string()),
})

export const structuringOutputSchema = z.object({
  sections: z.record(z.enum(SECTION_IDS), structuringSectionSchema),
})

export type StructuringSection = z.infer<typeof structuringSectionSchema>
export type StructuringOutput = {
  sections: Partial<Record<SectionId, StructuringSection>>
}

export type StructuringValidation =
  | { ok: true; value: StructuringOutput }
  | { ok: false; issues: string[] }

export function validateStructuringOutput(
  raw: unknown,
  knownSegmentIds: readonly string[],
): StructuringValidation {
  const parsed = structuringOutputSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`,
      ),
    }
  }

  const known = new Set(knownSegmentIds)
  const issues: string[] = []

  for (const [sectionId, section] of Object.entries(parsed.data.sections)) {
    const id = sectionId as SectionId
    for (const segmentId of section.sourceSegmentIds) {
      if (!known.has(segmentId)) {
        issues.push(
          `sections.${id}: el segmento «${segmentId}» no existe en la transcripción.`,
        )
      }
    }
    if (section.presence === "STATED" && section.text.trim().length === 0) {
      issues.push(`sections.${id}: STATED exige texto no vacío.`)
    }
    if (
      section.presence === "NOT_STATED" &&
      (section.text.length > 0 || section.sourceSegmentIds.length > 0)
    ) {
      issues.push(
        `sections.${id}: NOT_STATED debe quedar vacío (sin texto ni orígenes).`,
      )
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    value: { sections: parsed.data.sections as StructuringOutput["sections"] },
  }
}
