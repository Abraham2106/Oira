import type { TranscriptSegment } from "@oira/types"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  segment: TranscriptSegment
  highlighted?: boolean
}

const SPEAKER_KEYS: Record<string, string> = {
  Médico: "speakers.physician",
  Paciente: "speakers.patient",
}

export function TranscriptSegmentView({ segment, highlighted = false }: Props) {
  const { t } = useI18n()
  const minutes = Math.floor(segment.startMs / 60000)
    .toString()
    .padStart(2, "0")
  const seconds = Math.floor((segment.startMs % 60000) / 1000)
    .toString()
    .padStart(2, "0")
  let speakerText = ""
  if (segment.speaker) {
    const key = SPEAKER_KEYS[segment.speaker]
    speakerText = ` · ${key ? t(key) : segment.speaker}`
  }

  return (
    <li
      id={`segment-${segment.id}`}
      className={highlighted ? "segment segment-highlighted" : "segment"}
    >
      <span className="muted">
        {minutes}:{seconds}
        {speakerText}
      </span>
      <p>{segment.text}</p>
    </li>
  )
}
