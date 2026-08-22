import { Button, Card, StatusBadge } from "@notalocal/ui"
import { SECTION_IDS, type ClinicalNote, type ProductState, type TranscriptSegment } from "@notalocal/types"
import { ClinicalNoteSection } from "../../components/ClinicalNoteSection"
import { ReviewActions } from "../../components/ReviewActions"
import { TranscriptViewer } from "../../components/TranscriptViewer"

type Props = {
  state: ProductState
  note: ClinicalNote
  transcript: TranscriptSegment[]
  confirmed: boolean
  onConfirmChange: (value: boolean) => void
  onEdit: (sectionId: keyof ClinicalNote["sections"], text: string) => void
  onAccept: () => void
  onExport: () => void
}

export function ReviewScreen({
  state,
  note,
  transcript,
  confirmed,
  onConfirmChange,
  onEdit,
  onAccept,
  onExport,
}: Props) {
  const accepted = state === "ACCEPTED" || state === "EXPORTED"
  const canAccept = (state === "READY_FOR_REVIEW" || state === "EDITING") && confirmed

  return (
    <div className="review-page">
      <div className="review-banner">
        {accepted ? (
          <StatusBadge tone="ok" icon="✓" label="Revisada por el médico" />
        ) : (
          <StatusBadge tone="warn" icon="!" label="Borrador — requiere revisión médica" />
        )}
      </div>
      <div className="review-split">
        <Card title="Borrador de nota">
          {SECTION_IDS.map((id) => (
            <ClinicalNoteSection
              key={id}
              id={id}
              value={note.sections[id]}
              readOnly={accepted}
              onChange={(text) => onEdit(id, text)}
            />
          ))}
          {!accepted ? (
            <ReviewActions
              canAccept={canAccept}
              confirmed={confirmed}
              onConfirmChange={onConfirmChange}
              onAccept={onAccept}
            />
          ) : (
            <Button variant="primary" onClick={onExport}>
              Copiar nota
            </Button>
          )}
        </Card>
        <Card title="Transcripción de la consulta">
          <TranscriptViewer segments={transcript} />
        </Card>
      </div>
    </div>
  )
}
