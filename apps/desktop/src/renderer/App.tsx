import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@oira/ui"
import type { SectionId } from "@oira/types"
import type { AuthSessionState } from "../shared/types/auth-profile"
import { formatNoteAsText } from "./bridge/mock"
import { getBridge } from "./bridge/oira"
import { FlowStepper } from "./components/FlowStepper"
import { Icon, type IconName } from "./components/icons"
import { flowStepFromState } from "./lib/consultFlow"
import { pickTag, sampleHistory, type PatientHistoryEntry } from "./lib/patientTags"
import { useI18n } from "./i18n/I18nProvider"
import { DashboardScreen } from "./screens/Dashboard/Dashboard"
import { ExportScreen } from "./screens/Export/Export"
import { DeviceReadyScreen } from "./screens/DeviceReady/DeviceReady"
import { LoginScreen } from "./screens/Login/Login"
import { NewConsultationScreen } from "./screens/NewConsultation/NewConsultation"
import { NotesListScreen } from "./screens/NotesList/NotesList"
import { PatientsScreen } from "./screens/Patients/Patients"
import { ProcessingScreen } from "./screens/Processing/Processing"
import { RecordingScreen } from "./screens/Recording/Recording"
import { ReviewScreen } from "./screens/Review/Review"
import { SettingsScreen } from "./screens/Settings/Settings"
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
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>("dashboard")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<SectionId | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [history, setHistory] = useState<PatientHistoryEntry[]>(() => sampleHistory())
  const [auth, setAuth] = useState<AuthSessionState>({
    authenticated: false,
    profile: null,
  })
  const recordedExportRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getBridge()
      .getAuthSession()
      .then((session) => {
        if (!cancelled) setAuth(session)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const busy = BUSY_STATES.has(encounter.productState)
  const inReview = REVIEW_STATES.has(encounter.productState)

  const copyPreview = async (text?: string) => {
    if (!encounter.note) return
    await navigator.clipboard.writeText(text ?? formatNoteAsText(encounter.note))
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

  const startNewConsult = useCallback(() => {
    if (REVIEW_STATES.has(encounter.productState) && encounter.note) {
      const discard = window.confirm(t("dialog.discardDraftBody"))
      if (!discard) return
    }
    resetReviewChrome()
    setSettingsOpen(false)
    encounter.reset()
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

  if (!auth.authenticated) {
    return (
      <LoginScreen
        onSignedIn={(profile) => setAuth({ authenticated: true, profile })}
      />
    )
  }

  return (
    <div className="shell">
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
            <button
              className="nl-button"
              type="button"
              onClick={() => {
                resetReviewChrome()
                encounter.reset()
              }}
            >
              {t("app.backToStart")}
            </button>
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
            onStart={() => void encounter.startRecording()}
          />
        ) : null}

        {showFlow && encounter.productState === "RECORDING" && encounter.recordingStartedAt ? (
          <RecordingScreen
            startedAtMs={encounter.recordingStartedAt}
            onStop={() => void encounter.stopRecording()}
            onDiscard={() => {
              resetReviewChrome()
              encounter.reset()
            }}
          />
        ) : null}

        {showFlow &&
        (encounter.productState === "TRANSCRIBING" || encounter.productState === "STRUCTURING") ? (
          <ProcessingScreen state={encounter.productState} />
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
            profile={auth.profile}
            onSignedOut={() => setAuth({ authenticated: false, profile: null })}
          />
        ) : null}
      </div>
    </div>
  )
}
