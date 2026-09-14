import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@oira/ui"
import type { SectionId } from "@oira/types"
import type { QwenLifecycleState, WhisperLifecycleState, DeviceLifecycleInfo } from "../shared/types/model-lifecycle"
import { formatNoteAsText } from "../shared/clinical-export"
import { getBridge } from "./bridge/oira"
import { FlowStepper } from "./components/FlowStepper"
import { Icon, type IconName } from "./components/icons"
import { ModelDebugPanel, reduceModelDebugState } from "./components/ModelDebugPanel"
import { flowStepFromState } from "./lib/consultFlow"
import { pickTag, sampleHistory, type PatientHistoryEntry } from "./lib/patientTags"
import { useI18n } from "./i18n/I18nProvider"
import { DashboardScreen } from "./screens/Dashboard/Dashboard"
import { ExportScreen } from "./screens/Export/Export"
import { DeviceReadyScreen } from "./screens/DeviceReady/DeviceReady"
import { NewConsultationScreen } from "./screens/NewConsultation/NewConsultation"
import { NotesListScreen } from "./screens/NotesList/NotesList"
import { PatientsScreen } from "./screens/Patients/Patients"
import { ProcessingScreen } from "./screens/Processing/Processing"
import { RecordingScreen } from "./screens/Recording/Recording"
import { ReviewScreen } from "./screens/Review/Review"
import { SettingsScreen } from "./screens/Settings/Settings"
import { StartupScreen } from "./screens/Startup/Startup"
import { TeamScreen } from "./screens/Team/Team"
import { useEncounter } from "./state/useEncounter"

type View = "dashboard" | "consult" | "notes" | "patients" | "team"

const NAV_ITEMS: ReadonlyArray<{ id: View; icon: IconName }> = [
  { id: "dashboard", icon: "dashboard" },
  { id: "notes", icon: "note" },
  { id: "patients", icon: "patient" },
  { id: "team", icon: "team" },
]

const BUSY_STATES: ReadonlySet<string> = new Set(["RECORDING", "TRANSCRIBING", "STRUCTURING"])
const REVIEW_STATES: ReadonlySet<string> = new Set(["READY_FOR_REVIEW", "EDITING", "ACCEPTED"])

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
}

export function App() {
  const { t } = useI18n()
  const encounter = useEncounter()
  const [booting, setBooting] = useState(true)
  const [modelDebug, setModelDebug] = useState<{
    whisper: WhisperLifecycleState
    qwen: QwenLifecycleState
    whisperDevice?: DeviceLifecycleInfo
    qwenDevice?: DeviceLifecycleInfo
  }>({
    whisper: "IDLE",
    qwen: "IDLE",
  })
  const [ready, setReady] = useState(false)
  const [recorderPrepared, setRecorderPrepared] = useState(false)
  const [view, setView] = useState<View>("dashboard")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<SectionId | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [history, setHistory] = useState<PatientHistoryEntry[]>(() => sampleHistory())
  const [copyError, setCopyError] = useState<string | null>(null)
  const recordedExportRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const minimumVisible = new Promise<void>((resolve) => window.setTimeout(resolve, 4_500))
    void Promise.all([
      getBridge().getSettings().catch(() => undefined),
      minimumVisible,
    ]).finally(() => {
      if (!cancelled) setBooting(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => getBridge().onModelLifecycle((event) => {
    setModelDebug((current) => reduceModelDebugState(current, event))
  }), [])

  const busy = BUSY_STATES.has(encounter.productState)
  const inReview = REVIEW_STATES.has(encounter.productState)

  const copyPreview = async (text?: string) => {
    if (!encounter.note) return
    setCopyError(null)
    try {
      const bridge = await getBridge()
      await bridge.writeClipboard(text ?? formatNoteAsText(encounter.note))
    } catch {
      setCopyError(t("export.copyFailed"))
      return
    }
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
    setCopyError(null)
  }, [])

  const startNewConsult = useCallback(() => {
    if (REVIEW_STATES.has(encounter.productState) && encounter.note) {
      const discard = window.confirm(t("dialog.discardDraftBody"))
      if (!discard) return
    }
    resetReviewChrome()
    setSettingsOpen(false)
    encounter.reset()
    setRecorderPrepared(false)
    setView("consult")
    setReady(true)
  }, [encounter, resetReviewChrome, t])

  useEffect(() => {
    const current = encounter.encounter
    if (!current || encounter.productState !== "EXPORTED") return
    if (recordedExportRef.current === current.id) return
    recordedExportRef.current = current.id
    setHistory((rows) => [
      {
        id: current.id,
        tag: pickTag(rows.map((row) => row.tag)),
        label: encounter.label.trim() ? encounter.label : "",
        visitType: encounter.visitType.trim() ? encounter.visitType : t("consult.defaultVisitType"),
        updatedAtMs: Date.now(),
        exported: true,
      },
      ...rows,
    ])
  }, [encounter.productState, encounter.encounter, encounter.label, encounter.visitType])

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
        void encounter.acceptNote(true)
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

  const openSection = (target: View | "settings") => {
    if (!ready) {
      setReady(true)
      if (target !== "settings") setView(target)
      return
    }
    if (target === "settings") {
      setSettingsOpen((open) => !open)
    } else {
      setView(target)
    }
  }

  const showFlow = ready && view === "consult"

  if (booting) return <StartupScreen />

  return (
    <div className="shell">
      <ModelDebugPanel {...modelDebug} />
      <aside className="sidenav">
        <div className="sidenav-brand">
          <strong className="wordmark">
            oira<span aria-hidden="true">.</span>
          </strong>
          <span className="tagline">{t("app.tagline")}</span>
        </div>
        <div className="sidenav-cta">
          <Button variant="primary" disabled={busy} onClick={startNewConsult}>
            <Icon name="plus" size={18} />
            {t("action.newConsult")}
          </Button>
        </div>
        <nav className="sidenav-nav" aria-label={t("nav.aria")}>
          {NAV_ITEMS.map((item) => {
            const active = ready && !settingsOpen && view === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={active ? "sidenav-link sidenav-link-active" : "sidenav-link"}
                disabled={busy && item.id !== "dashboard"}
                onClick={() => openSection(item.id)}
              >
                <Icon name={item.icon} />
                {t(`nav.${item.id}`)}
              </button>
            )
          })}
          <button
            type="button"
            className={settingsOpen ? "sidenav-link sidenav-link-active" : "sidenav-link"}
            onClick={() => openSection("settings")}
          >
            <Icon name="settings" />
            {t("nav.settings")}
          </button>
        </nav>
        <footer className="sidenav-footer">
          <span>v0.1</span>
          <span>{t("app.localUse")}</span>
        </footer>
      </aside>

      <div className="maincol">
        <header className="topbar">
          <div className="brand">
            <strong className="wordmark">
              oira<span aria-hidden="true">.</span>
            </strong>
            <span className="tagline">{t("app.tagline")}</span>
          </div>
          <Button onClick={() => openSection("settings")}>
            {settingsOpen ? t("nav.closeSettings") : t("nav.settings")}
          </Button>
        </header>

        {!ready ? null : showFlow ? (
          <div className="stepper-bar">
            <FlowStepper current={flowStepFromState(encounter.productState)} />
          </div>
        ) : inReview ? (
          <div className="resume-bar">
            <span>{t("app.resumeHint")}</span>
            <button type="button" className="linkish" onClick={() => setView("consult")}>
              {t("app.backToReview")}
            </button>
          </div>
        ) : null}

        {encounter.errorMessage ? (
          <div className="error" role="alert">
            <p>{encounter.errorMessage}</p>
            {encounter.unvalidatedDraft ? (
              <div className="draft-unvalidated" data-testid="unvalidated-draft">
                <p>{t("draft.unvalidatedHelper")}</p>
                {encounter.unvalidatedDraft.issues.length > 0 ? (
                  <>
                    <p className="draft-unvalidated-issues-title">
                      {t("draft.unvalidatedIssues")}
                    </p>
                    <ul>
                      {encounter.unvalidatedDraft.issues.map((issue, index) => (
                        <li key={index}>{issue.message}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <details>
                  <summary>{t("draft.unvalidatedShow")}</summary>
                  <pre className="draft-unvalidated-text">
                    {encounter.unvalidatedDraft.text}
                  </pre>
                </details>
              </div>
            ) : null}
            <button
              className="nl-button"
              type="button"
              onClick={() => {
                resetReviewChrome()
                encounter.reset()
                setRecorderPrepared(false)
              }}
            >
              {t("app.backToStart")}
            </button>
          </div>
        ) : null}

        {copyError ? (
          <div className="error" role="alert">
            <p>{copyError}</p>
          </div>
        ) : null}

        {!ready && !settingsOpen ? (
          <DeviceReadyScreen
            onContinue={() => {
              setReady(true)
              setView("dashboard")
            }}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : null}

        {settingsOpen ? <SettingsScreen onClose={() => setSettingsOpen(false)} /> : null}

        {showFlow && encounter.productState === "IDLE" ? (
          <NewConsultationScreen
            label={encounter.label}
            visitType={encounter.visitType}
            informed={encounter.informed}
            onLabel={encounter.setLabel}
            onVisitType={encounter.setVisitType}
            onInformed={encounter.setInformed}
            onPrepare={() => {
              encounter.prepareRecording()
              setRecorderPrepared(true)
            }}
          />
        ) : null}

        {showFlow && (encounter.productState === "RECORDING" || (encounter.productState === "IDLE" && recorderPrepared)) ? (
          <RecordingScreen
            isRecording={encounter.productState === "RECORDING"}
            starting={encounter.captureStarting}
            startedAtMs={encounter.recordingStartedAt ?? undefined}
            onStart={() => void encounter.startRecording()}
            onStop={() => void encounter.stopRecording()}
            onDiscard={() => {
              resetReviewChrome()
              encounter.reset()
              setRecorderPrepared(false)
            }}
          />
        ) : null}

        {showFlow &&
        (encounter.productState === "TRANSCRIBING" || encounter.productState === "STRUCTURING") ? (
          <ProcessingScreen state={encounter.productState} transcript={encounter.transcript} />
        ) : null}
        {showFlow && encounter.productState === "ERROR" && encounter.transcript.length > 0 ? (
          <ProcessingScreen state="STRUCTURING" failed transcript={encounter.transcript} />
        ) : null}

        {showFlow &&
        (encounter.productState === "READY_FOR_REVIEW" ||
          encounter.productState === "EDITING" ||
          encounter.productState === "ACCEPTED") &&
        encounter.note ? (
          <ReviewScreen
            state={encounter.productState}
            note={encounter.note}
            transcript={encounter.transcript}
            reviewerResult={encounter.reviewerResult}
            confirmed={reviewConfirmed}
            activeSectionId={activeSectionId}
            highlightedIds={highlightedIds}
            onConfirmChange={setReviewConfirmed}
            onEdit={encounter.editNote}
            onToggleReviewed={encounter.toggleReviewed}
            onFocusSection={focusSection}
            onJumpToSource={jumpToSource}
            onAccept={() => void encounter.acceptNote(true)}
            onExport={() => void copyPreview()}
          />
        ) : null}

        {showFlow && encounter.productState === "EXPORTED" && encounter.note ? (
          <ExportScreen
            preview={formatNoteAsText(encounter.note)}
            copied={encounter.copied}
            onCopy={copyPreview}
            onReset={() => {
              resetReviewChrome()
              encounter.reset()
              setView("dashboard")
            }}
          />
        ) : null}

        {ready && !settingsOpen && view === "dashboard" ? (
          <DashboardScreen
            productState={encounter.productState}
            hasDraft={Boolean(encounter.note)}
            onStartNew={startNewConsult}
            onOpenNotes={() => setView("notes")}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : null}

        {ready && !settingsOpen && view === "notes" ? (
          <NotesListScreen
            hasSessionNote={Boolean(encounter.note)}
            sessionStateLabel={t(`state.${encounter.productState}`)}
            noteLabel={encounter.label}
            onView={() => setView("consult")}
            onStartNew={startNewConsult}
          />
        ) : null}

        {ready && !settingsOpen && view === "patients" ? (
          <PatientsScreen entries={history} onStartNew={startNewConsult} />
        ) : null}

        {ready && !settingsOpen && view === "team" ? (
          <TeamScreen
            profile={null}
            onSignedOut={() => undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
