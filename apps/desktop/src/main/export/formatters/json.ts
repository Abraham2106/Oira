import { exportJsonPayloadSchema } from "../../../shared/schemas/export.schema"
import type { ApprovedNote } from "../../../shared/types/notes"
import type { StructuredClinicalFacts } from "../../../shared/schemas/clinical.schema"
import { createAppError } from "../../utils/app-error"

export { exportJsonPayloadSchema } from "../../../shared/schemas/export.schema"
export type { ExportJsonPayload } from "../../../shared/schemas/export.schema"

export function formatNoteJson(input: {
  note: ApprovedNote
  facts: StructuredClinicalFacts | null
  model: { name: string | null; promptVersion: string | null }
}): string {
  const parsed = exportJsonPayloadSchema.safeParse(input)
  if (!parsed.success) {
    throw createAppError(
      "EXPORT_FAILED",
      "The export payload failed validation.",
      { retryable: false },
    )
  }
  return `${JSON.stringify(parsed.data, null, 2)}\n`
}
