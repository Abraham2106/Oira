import type { TranscriptSegment } from "@notalocal/types"
import { TranscriptSegmentView } from "./TranscriptSegment"

type Props = {
  segments: TranscriptSegment[]
}

export function TranscriptViewer({ segments }: Props) {
  if (segments.length === 0) {
    return <p className="muted">Aún no hay transcripción.</p>
  }

  return (
    <ol className="transcript">
      {segments.map((segment) => (
        <TranscriptSegmentView key={segment.id} segment={segment} />
      ))}
    </ol>
  )
}
