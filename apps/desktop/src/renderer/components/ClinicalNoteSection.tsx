import type { FieldValue, SectionId, TranscriptSegment } from "@oira/types"
import { NotStatedBadge } from "./NotStatedBadge"
import { SourceEvidencePopover } from "./SourceEvidencePopover"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  id: SectionId
  value: FieldValue
  readOnly: boolean
  transcript: TranscriptSegment[]
  active: boolean
  onChange: (text: string) => void
  onFocusSection: () => void
  onJumpToSource: (segmentId: string) => void
  onToggleReviewed: (reviewed: boolean) => void
}

export function ClinicalNoteSection({
  id,
  value,
  readOnly,
  transcript,
  active,
  onChange,
  onFocusSection,
  onJumpToSource,
  onToggleReviewed,
}: Props) {
  const { t } = useI18n()
  return (
    <article className={active ? "section section-active" : "section"}>
      <header className="section-head">
        <h3>{t(`sections.${id}`)}</h3>
        {value.presence === "NOT_STATED" ? <NotStatedBadge reason="not_stated" /> : null}
        {value.presence === "UNKNOWN" ? <NotStatedBadge reason="unknown" /> : null}
      </header>
      <textarea
        id={id}
        readOnly={readOnly}
        value={value.text}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocusSection}
        rows={4}
        aria-label={t(`sections.${id}`)}
      />
      <SourceEvidencePopover
        sourceSegmentIds={value.sourceSegmentIds}
        transcript={transcript}
        onJump={onJumpToSource}
      />
      {!readOnly ? (
        <label className="check check-compact">
          <input
            type="checkbox"
            checked={value.reviewed}
            onChange={(event) => onToggleReviewed(event.target.checked)}
          />
          {t("section.reviewedLabel")}
        </label>
      ) : null}
    </article>
  )
}
