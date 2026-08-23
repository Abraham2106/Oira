import { exportJsonPayloadSchema } from "../../../shared/schemas/export.schema"
import type { ApprovedNote } from "../../../shared/types/notes"
import type { StructuredClinicalFacts } from "../../../shared/schemas/clinical.schema"

export { exportJsonPayloadSchema } from "../../../shared/schemas/export.schema"
export type { ExportJsonPayload } from "../../../shared/schemas/export.schema"

export function formatNoteJson(input: {
  note: ApprovedNote
  facts: StructuredClinicalFacts | null
  model: { name: string | null; promptVersion: string | null }
}): string {
  const parsed = exportJsonPayloadSchema.parse(input)
  return `${JSON.stringify(parsed, null, 2)}\n`
}
