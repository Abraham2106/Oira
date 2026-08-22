import { useEffect } from "react"
import { Button, Card, StatusBadge } from "@notalocal/ui"
import { SECTION_IDS, type ClinicalNote, type ProductState, type TranscriptSegment } from "@notalocal/types"
import { ClinicalNoteSection } from "../../components/ClinicalNoteSection"
import { ReviewActions } from "../../components/ReviewActions"
import { TranscriptViewer } from "../../components/TranscriptViewer"
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
          <StatusBadge tone="ok" icon="✓" label="Revisada por el médico" />
        ) : (
          <StatusBadge tone="warn" icon="!" label="Borrador — requiere revisión médica" />
        )}
        <p className="muted review-hint">
          A la izquierda el borrador; a la derecha la transcripción. Pulse un origen para resaltar
          el fragmento literal.
        </p>
      </div>
      <div className="review-split">
        <Card title="Borrador de nota">
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
        <Card title="Transcripción de la consulta">
          <div className="review-pane">
            <TranscriptViewer segments={transcript} highlightedIds={highlightedIds} />
          </div>
        </Card>
      </div>
      {accepted ? (
        <div className="review-dock">
          <Button variant="primary" onClick={onExport}>
            Copiar nota
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
