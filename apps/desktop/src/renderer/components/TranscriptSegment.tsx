import type { TranscriptSegment } from "@notalocal/types"

type Props = {
  segment: TranscriptSegment
}

export function TranscriptSegmentView({ segment }: Props) {
  const minutes = Math.floor(segment.startMs / 60000)
    .toString()
    .padStart(2, "0")
  const seconds = Math.floor((segment.startMs % 60000) / 1000)
    .toString()
    .padStart(2, "0")

  return (
    <li className="segment">
      <span className="muted">
        {minutes}:{seconds} · {segment.speaker}
      </span>
      <p>{segment.text}</p>
    </li>
  )
}
