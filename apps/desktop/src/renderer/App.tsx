import { useCallback, useEffect, useState } from "react"
import { Button, StatusBadge } from "@notalocal/ui"
import type { SectionId } from "@notalocal/types"
import { formatNoteAsText } from "./bridge/mock"
import { FlowStepper } from "./components/FlowStepper"
import { flowStepFromState } from "./lib/consultFlow"
import { ExportScreen } from "./screens/Export/Export"
import { DeviceReadyScreen } from "./screens/DeviceReady/DeviceReady"
import { NewConsultationScreen } from "./screens/NewConsultation/NewConsultation"
import { ProcessingScreen } from "./screens/Processing/Processing"
import { RecordingScreen } from "./screens/Recording/Recording"
import { ReviewScreen } from "./screens/Review/Review"
import { SettingsScreen } from "./screens/Settings/Settings"
import { useEncounter } from "./state/useEncounter"

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}

export function App() {
  const encounter = useEncounter()
  const [ready, setReady] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<SectionId | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])

  const copyPreview = async () => {
    if (!encounter.note) return
    const text = formatNoteAsText(encounter.note)
    await navigator.clipboard.writeText(text)
    await encounter.exportNote()
  }

  const focusSection = (sectionId: SectionId) => {
    setActiveSectionId(sectionId)
    const sources = encounter.note?.sections[sectionId].sourceSegmentIds ?? []
    setHighlightedIds(sources)
  }

  const jumpToSource = (segmentId: string) => {
    setHighlightedIds([segmentId])
  }

  const resetReviewChrome = useCallback(() => {
    setReviewConfirmed(false)
    setActiveSectionId(null)
    setHighlightedIds([])
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
        setHighlightedIds([])
        return
      }
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !typingTarget(event.target)) {
        event.preventDefault()
        setSettingsOpen((open) => !open)
        return
      }
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return
      if (encounter.productState === "RECORDING") {
        event.preventDefault()
        void encounter.stopRecording()
        return
      }
      if (
        (encounter.productState === "READY_FOR_REVIEW" || encounter.productState === "EDITING") &&
        reviewConfirmed
      ) {
        event.preventDefault()
        void encounter.acceptNote()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    encounter.productState,
    encounter.stopRecording,
    encounter.acceptNote,
    reviewConfirmed,
  ])

  const showConsult = ready && !settingsOpen

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>NotaLocal</strong>
          <StatusBadge tone="info" label="Prototipo · puente mock" />
        </div>
        {ready ? <FlowStepper current={flowStepFromState(encounter.productState)} /> : null}
        <Button onClick={() => setSettingsOpen((open) => !open)}>
          {settingsOpen ? "Cerrar" : "Privacidad"}
        </Button>
      </header>
      {encounter.errorMessage ? (
        <div className="error" role="alert">
          <p>{encounter.errorMessage}</p>
          <button
            className="nl-button"
            type="button"
            onClick={() => {
              resetReviewChrome()
              encounter.reset()
            }}
          >
            Volver al inicio
          </button>
        </div>
      ) : null}
      {!ready && !settingsOpen ? (
        <DeviceReadyScreen
          onContinue={() => setReady(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}
      {settingsOpen ? <SettingsScreen onClose={() => setSettingsOpen(false)} /> : null}
      {showConsult && encounter.productState === "IDLE" ? (
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
      {showConsult && encounter.productState === "RECORDING" && encounter.recordingStartedAt ? (
        <RecordingScreen
          startedAtMs={encounter.recordingStartedAt}
          onStop={() => void encounter.stopRecording()}
          onDiscard={() => {
            resetReviewChrome()
            encounter.reset()
          }}
        />
      ) : null}
      {showConsult &&
      (encounter.productState === "TRANSCRIBING" || encounter.productState === "STRUCTURING") ? (
        <ProcessingScreen state={encounter.productState} />
      ) : null}
      {showConsult &&
      (encounter.productState === "READY_FOR_REVIEW" ||
        encounter.productState === "EDITING" ||
        encounter.productState === "ACCEPTED") &&
      encounter.note ? (
        <ReviewScreen
          state={encounter.productState}
          note={encounter.note}
          transcript={encounter.transcript}
          confirmed={reviewConfirmed}
          activeSectionId={activeSectionId}
          highlightedIds={highlightedIds}
          onConfirmChange={setReviewConfirmed}
          onEdit={encounter.editNote}
          onToggleReviewed={encounter.toggleReviewed}
          onFocusSection={focusSection}
          onJumpToSource={jumpToSource}
          onAccept={() => void encounter.acceptNote()}
          onExport={() => void copyPreview()}
        />
      ) : null}
      {showConsult && encounter.productState === "EXPORTED" && encounter.note ? (
        <ExportScreen
          preview={formatNoteAsText(encounter.note)}
          copied={encounter.copied}
          onCopy={copyPreview}
          onReset={() => {
            resetReviewChrome()
            encounter.reset()
          }}
        />
      ) : null}
    </div>
  )
}
