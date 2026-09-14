import { SECTION_IDS, type ClinicalNote, type FieldValue, type SectionId } from "@oira/types"
import type { StructuringOutput } from "./schema"

function emptyField(): FieldValue {
  return { text: "", presence: "NOT_STATED", sourceSegmentIds: [], provenance: "EXTRACTED", reviewed: false }
}

export function noteFromStructuringOutput(output: StructuringOutput): ClinicalNote {
  const sections = Object.fromEntries(
    SECTION_IDS.map((id) => {
      const section = output.sections[id]
      if (!section) return [id, emptyField()]
      const field: FieldValue = {
        text: section.text,
        presence: section.presence,
        sourceSegmentIds: [...section.sourceSegmentIds],
        provenance: "EXTRACTED",
        reviewed: false,
      }
      return [id, field]
    }),
  ) as Record<SectionId, FieldValue>

  return { sections }
}
