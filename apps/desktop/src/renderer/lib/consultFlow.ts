import type { ClinicalNote, ProductState, TranscriptSegment } from "@oira/types"

export const FLOW_STEPS = [
  { id: "consult", label: "Consulta" },
  { id: "record", label: "Grabación" },
  { id: "process", label: "Procesamiento" },
  { id: "review", label: "Revisión" },
  { id: "export", label: "Exportar" },
] as const

export type FlowStepId = (typeof FLOW_STEPS)[number]["id"]

export function flowStepFromState(state: ProductState): FlowStepId {
  switch (state) {
    case "RECORDING":
      return "record"
    case "TRANSCRIBING":
    case "STRUCTURING":
      return "process"
    case "READY_FOR_REVIEW":
    case "EDITING":
    case "ACCEPTED":
      return "review"
    case "EXPORTED":
      return "export"
    default:
      return "consult"
  }
}

export function filterTranscript(
  segments: TranscriptSegment[],
  query: string,
): TranscriptSegment[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return segments
  return segments.filter((segment) => {
    return (
      segment.text.toLowerCase().includes(needle) ||
      segment.speaker.toLowerCase().includes(needle)
    )
  })
}

export function unreviewedSectionCount(note: ClinicalNote | null): number {
  if (!note) return 0
  return Object.values(note.sections).filter((section) => !section.reviewed).length
}

export function quotesForSources(
  segments: TranscriptSegment[],
  sourceSegmentIds: string[],
): Array<{ id: string; quote: string; found: boolean }> {
  return sourceSegmentIds.map((id) => {
    const match = segments.find((segment) => segment.id === id)
    return {
      id,
      quote: match?.text ?? "",
      found: Boolean(match),
    }
  })
}
