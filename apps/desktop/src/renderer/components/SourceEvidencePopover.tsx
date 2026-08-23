import { quotesForSources } from "../lib/consultFlow"
import type { TranscriptSegment } from "@oira/types"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  sourceSegmentIds: string[]
  transcript: TranscriptSegment[]
  onJump: (segmentId: string) => void
}

export function SourceEvidencePopover({ sourceSegmentIds, transcript, onJump }: Props) {
  const { t } = useI18n()

  if (sourceSegmentIds.length === 0) {
    return <p className="muted">{t("evidence.noSource")}</p>
  }

  const quotes = quotesForSources(transcript, sourceSegmentIds)

  return (
    <div className="evidence">
      <p className="evidence-label">{t("evidence.label")}</p>
      <ul>
        {quotes.map((item) => (
          <li key={item.id}>
            {item.found ? (
              <button type="button" className="linkish" onClick={() => onJump(item.id)}>
                «{item.quote}»
              </button>
            ) : (
              <span className="muted">{t("evidence.missingSource").replace("{id}", item.id)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
