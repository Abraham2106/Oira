import { type SectionId, type TranscriptSegment } from "@oira/types"
import type { GenerationIssue } from "../generation-errors"
import type { StructuringOutput } from "../schema"

/** EV-EVID-* — la cita literal pertenece al segmento citado. */
export function collectEvidenceIssues(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): GenerationIssue[] {
  const knownIds = new Set(transcript.map((s) => s.id))
  return Object.entries(output.sections).reduce(
    (issues, [rawId, section]) => {
      if (!section) return issues
      const id = rawId as SectionId
      for (const sid of section.sourceSegmentIds) {
        if (!knownIds.has(sid)) {
          issues.push({
            code: "UNKNOWN_SOURCE",
            sectionId: id,
            message: `La sección ${id} cita el segmento "${sid}" que no existe en la transcripción.`,
          })
        }
      }
      return issues
    },
    [] as GenerationIssue[],
  )
}

/** Verifica que una cita literal pertenezca al contenido de su segmento. */
export function checkCitationsInSegment(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): GenerationIssue[] {
  const segmentTexts = new Map(transcript.map((s) => [s.id, s.text]))
  return Object.entries(output.sections).reduce(
    (issues, [rawId, section]) => {
      if (!section) return issues
      const id = rawId as SectionId
      const preview = section.text.trim().slice(0, 30)
      for (const sid of section.sourceSegmentIds) {
        const text = segmentTexts.get(sid)
        if (text && preview.trim() && !text.includes(preview)) {
          issues.push({
            code: "CITATION_MISMATCH",
            sectionId: id,
            message: `La sección ${id} cita "${sid}" pero su texto no se sustenta ahí.`,
          })
        }
      }
      return issues
    },
    [] as GenerationIssue[],
  )
}
