import { useState } from "react"
import { StatusBadge } from "@notalocal/ui"
import { formatNoteAsText } from "./bridge/mock"
import { ExportScreen } from "./screens/Export/Export"
import { NewConsultationScreen } from "./screens/NewConsultation/NewConsultation"
import { ProcessingScreen } from "./screens/Processing/Processing"
import { RecordingScreen } from "./screens/Recording/Recording"
import { ReviewScreen } from "./screens/Review/Review"
import { useEncounter } from "./state/useEncounter"

export function App() {
  const encounter = useEncounter()
  const [reviewConfirmed, setReviewConfirmed] = useState(false)

  const copyPreview = async () => {
    if (!encounter.note) return
    const text = formatNoteAsText(encounter.note)
    await navigator.clipboard.writeText(text)
    await encounter.exportNote()
  }

  return (
    <div className="shell">
      <header className="topbar">
        <strong>NotaLocal</strong>
        <StatusBadge tone="info" label="Prototipo · puente mock" />
      </header>
      {encounter.errorMessage ? (
        <div className="error" role="alert">
          <p>{encounter.errorMessage}</p>
          <button className="nl-button" type="button" onClick={encounter.reset}>
            Volver al inicio
          </button>
        </div>
      ) : null}
      {encounter.productState === "IDLE" ? (
        <NewConsultationScreen
          label={encounter.label}
          visitType={encounter.visitType}
          informed={encounter.informed}
          onLabel={encounter.setLabel}
          onVisitType={encounter.setVisitType}
          onInformed={encounter.setInformed}
          onStart={() => void encounter.startRecording()}
        />
      ) : null}
      {encounter.productState === "RECORDING" && encounter.recordingStartedAt ? (
        <RecordingScreen
          startedAtMs={encounter.recordingStartedAt}
          onStop={() => void encounter.stopRecording()}
        />
      ) : null}
      {encounter.productState === "TRANSCRIBING" || encounter.productState === "STRUCTURING" ? (
        <ProcessingScreen state={encounter.productState} />
      ) : null}
      {(encounter.productState === "READY_FOR_REVIEW" ||
        encounter.productState === "EDITING" ||
        encounter.productState === "ACCEPTED") &&
      encounter.note ? (
        <ReviewScreen
          state={encounter.productState}
          note={encounter.note}
          transcript={encounter.transcript}
          confirmed={reviewConfirmed}
          onConfirmChange={setReviewConfirmed}
          onEdit={encounter.editNote}
          onAccept={() => void encounter.acceptNote()}
          onExport={() => void copyPreview()}
        />
      ) : null}
      {encounter.productState === "EXPORTED" && encounter.note ? (
        <ExportScreen
          preview={formatNoteAsText(encounter.note)}
          copied={encounter.copied}
          onCopy={copyPreview}
          onReset={() => {
            setReviewConfirmed(false)
            encounter.reset()
          }}
        />
      ) : null}
    </div>
  )
}
