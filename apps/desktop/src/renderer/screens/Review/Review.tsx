import { useEffect } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import { SECTION_IDS, type ClinicalNote, type ProductState, type TranscriptSegment } from "@oira/types"
import { ClinicalNoteSection } from "../../components/ClinicalNoteSection"
import { ReviewActions } from "../../components/ReviewActions"
import { TranscriptViewer } from "../../components/TranscriptViewer"
import { useI18n } from "../../i18n/I18nProvider"
import { unreviewedSectionCount } from "../../lib/consultFlow"
import type {
  NoteVerificationResult,
  NoteClaimObservation,
} from "../../../shared/types/note-verification"

type Props = {
  state: ProductState
  note: ClinicalNote
  transcript: TranscriptSegment[]
  confirmed: boolean
  reviewerResult?: NoteVerificationResult | null
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

/** Severidad del hallazgo: "blocking" advierte al médico, no bloquea. */
const severityLabel = (t: (key: string) => string, s: NoteClaimObservation["severity"]) =>
  s === "blocking" ? t("review.severityBlocking") : t("review.severityWarning")

const statusLabel = (t: (key: string) => string, s: NoteClaimObservation["status"]) =>
  ({
    SUPPORTED: t("review.statusSupported"),
    CONTRADICTED: t("review.statusContradicted"),
    INSUFFICIENT_EVIDENCE: t("review.statusInsufficient"),
    AMBIGUOUS: t("review.statusAmbiguous"),
  })[s]

function FindingsPanel({ review }: { review: NoteVerificationResult }) {
  const { t } = useI18n()
  if (review.status === "not_completed") {
    return (
      <div className="review-findings" data-testid="review-findings">
        <StatusBadge tone="warn" icon="!" label={t("review.notCompleted")} />
        {review.error ? <p className="review-findings-error">{review.error}</p> : null}
        <p className="review-findings-note">{t("review.findingsNotCompletedNote")}</p>
      </div>
    )
  }
  const findings = review.observations.length + review.omissions.length
  if (findings === 0) {
    return (
      <div className="review-findings" data-testid="review-findings">
        <StatusBadge tone="ok" icon="✓" label={t("review.findingsNone")} />
      </div>
    )
  }
  return (
    <div className="review-findings" data-testid="review-findings">
      <h3 className="review-findings-title">{t("review.findingsTitle")}</h3>
      <ul className="review-findings-list">
        {review.observations.map((observation, index) => (
          <li
            key={`obs-${index}`}
            className={`finding ${observation.severity === "blocking" ? "finding-blocking" : "finding-warning"}`}
          >
            <div className="finding-head">
              <StatusBadge
                tone={observation.severity === "blocking" ? "warn" : "info"}
                icon={observation.severity === "blocking" ? "!" : "i"}
                label={`${statusLabel(t, observation.status)} · ${severityLabel(t, observation.severity)}`}
              />
              <span className="finding-problem">{observation.problemType}</span>
            </div>
            <p className="finding-claim">{observation.claim}</p>
            {observation.explanation ? (
              <p className="finding-explanation">{observation.explanation}</p>
            ) : null}
            {observation.evidence.quotes.length > 0 ? (
              <blockquote className="finding-quotes">
                {observation.evidence.quotes.map((quote, i) => (
                  <span key={i}>{quote}</span>
                ))}
              </blockquote>
            ) : null}
          </li>
        ))}
        {review.omissions.map((omission, index) => (
          <li key={`omiss-${index}`} className="finding finding-omission">
            <div className="finding-head">
              <StatusBadge tone="info" icon="·" label={t("review.omissionLabel")} />
              <span className="finding-problem">{omission.sectionId}</span>
            </div>
            <p className="finding-claim">{omission.missingClaim}</p>
            <p className="finding-explanation">{t("review.omissionExpected")}: {omission.expectedFromSource}</p>
          </li>
        ))}
      </ul>
      <p className="review-findings-note">{t("review.findingsDecisionNote")}</p>
    </div>
  )
}

export function ReviewScreen({
  state,
  note,
  transcript,
  confirmed,
  reviewerResult = null,
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
            {reviewerResult ? <FindingsPanel review={reviewerResult} /> : null}
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
