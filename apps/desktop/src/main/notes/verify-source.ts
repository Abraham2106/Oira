import type { ClinicalNote, TranscriptSegment } from "@oira/types"

/** Every cited segment id must exist on the transcript. No LLM involved. */
export function verifySource(
  note: ClinicalNote,
  transcript: TranscriptSegment[],
): boolean {
  const ids = new Set(transcript.map((segment) => segment.id))
  for (const field of Object.values(note.sections)) {
    if (
      field.provenance === "EXTRACTED" &&
      field.presence === "STATED" &&
      field.sourceSegmentIds.length === 0
    ) return false
    for (const sourceId of field.sourceSegmentIds) {
      if (!ids.has(sourceId)) return false
    }
  }
  return true
}
