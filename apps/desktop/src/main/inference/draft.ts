import type { ClinicalNote, FieldValue } from "@oira/types"
import type { StructuringPort, StructuringInput } from "./port"

function emptyField(): FieldValue {
  return { text: "", presence: "NOT_STATED", sourceSegmentIds: [], reviewed: false }
}

function statedField(text: string, sourceSegmentIds: string[]): FieldValue {
  return { text, presence: "STATED", sourceSegmentIds, reviewed: false }
}

/** Placeholder until Qwen is wired. Copies spoken text; does not diagnose. */
export function createTranscriptDraftStructuring(): StructuringPort {
  return {
    async structure(input: StructuringInput) {
      const ids = input.transcript.map((segment) => segment.id)
      const text = input.transcript
        .map((segment) => segment.text.trim())
        .filter((part) => part.length > 0)
        .join(" ")
        .trim()
      const spoken = text.length > 0
      const note: ClinicalNote = {
        sections: {
          visit_context: spoken ? statedField(text, ids) : emptyField(),
          clinical_narrative: spoken ? statedField(text, ids) : emptyField(),
          relevant_history: emptyField(),
          reported_findings: emptyField(),
          clinician_documented_assessment: emptyField(),
          clinician_documented_plan: emptyField(),
          follow_up: emptyField(),
        },
      }
      return { note }
    },
  }
}
