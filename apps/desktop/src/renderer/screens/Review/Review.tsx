import { useEffect } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import { SECTION_IDS, type ClinicalNote, type ProductState, type TranscriptSegment } from "@oira/types"
import { ClinicalNoteSection } from "../../components/ClinicalNoteSection"
import { ReviewActions } from "../../components/ReviewActions"
import { TranscriptViewer } from "../../components/TranscriptViewer"
import { useI18n } from "../../i18n/I18nProvider"
import { unreviewedSectionCount } from "../../lib/consultFlow"

type Props = {
  state: ProductState
  note: ClinicalNote
  transcript: TranscriptSegment[]
  confirmed: boolean
  activeSectionId: keyof ClinicalNote["sections"] | null
  highlightedIds: string[]
  onConfirmChange: (value: boolean) => void
  onEdit: (sectionId: keyof ClinicalNote["sections"], text: string) => void
  onToggleReviewed: (sectionId: keyof ClinicalNote["sections"], reviewed: boolean) => void
  onFocusSection: (sectionId: keyof ClinicalNote["sections"]) => void
  onJumpToSource: (segmentId: string) => void
  onAccept: () => void
  onExport: () => void
}

export function ReviewScreen({
  state,
  note,
  transcript,
  confirmed,
  activeSectionId,
  highlightedIds,
  onConfirmChange,
  onEdit,
  onToggleReviewed,
  onFocusSection,
  onJumpToSource,
  onAccept,
  onExport,
}: Props) {
  const { t } = useI18n()
  const accepted = state === "ACCEPTED" || state === "EXPORTED"
  const canAccept = (state === "READY_FOR_REVIEW" || state === "EDITING") && confirmed
  const remaining = unreviewedSectionCount(note)

  useEffect(() => {
    const id = highlightedIds[0]
    if (!id) return
    document.getElementById(`segment-${id}`)?.scrollIntoView({ block: "nearest" })
  }, [highlightedIds])

  return (
    <div className="review-page">
      <div className="review-banner">
        {accepted ? (
          <StatusBadge tone="ok" icon="✓" label={t("review.badgeReviewed")} />
        ) : (
          <StatusBadge tone="warn" icon="!" label={t("review.badgeDraft")} />
        )}
        <p className="muted review-hint">{t("review.hint")}</p>
      </div>
      <div className="review-split">
        <Card title={t("review.draftCardTitle")}>
          <div className="review-pane">
            {SECTION_IDS.map((id) => (
              <ClinicalNoteSection
                key={id}
                id={id}
                value={note.sections[id]}
                readOnly={accepted}
                transcript={transcript}
                active={activeSectionId === id}
                onChange={(text) => onEdit(id, text)}
                onFocusSection={() => onFocusSection(id)}
                onJumpToSource={onJumpToSource}
                onToggleReviewed={(reviewed) => onToggleReviewed(id, reviewed)}
              />
            ))}
          </div>
        </Card>
        <Card title={t("review.transcriptCardTitle")}>
          <div className="review-pane">
            <TranscriptViewer segments={transcript} highlightedIds={highlightedIds} />
          </div>
        </Card>
      </div>
      {accepted ? (
        <div className="review-dock">
          <Button variant="primary" onClick={onExport}>
            {t("review.copyNote")}
          </Button>
        </div>
      ) : (
        <div className="review-dock">
          <ReviewActions
            canAccept={canAccept}
            confirmed={confirmed}
            remaining={remaining}
            onConfirmChange={onConfirmChange}
            onAccept={onAccept}
          />
        </div>
      )}
    </div>
  )
}
