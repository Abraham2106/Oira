import type { TranscriptSegment } from "@notalocal/types"

type Props = {
  segment: TranscriptSegment
  highlighted?: boolean
}

export function TranscriptSegmentView({ segment, highlighted = false }: Props) {
  const minutes = Math.floor(segment.startMs / 60000)
    .toString()
    .padStart(2, "0")
  const seconds = Math.floor((segment.startMs % 60000) / 1000)
    .toString()
    .padStart(2, "0")

  return (
    <li
      id={`segment-${segment.id}`}
      className={highlighted ? "segment segment-highlighted" : "segment"}
    >
      <span className="muted">
        {segment.speaker
          ? `${minutes}:${seconds} · ${segment.speaker}`
          : `${minutes}:${seconds}`}
      </span>
      <p>{segment.text}</p>
    </li>
  )
}
