import { useCallback, useMemo, useRef, useState } from "react"
import type { ClinicalNote, Encounter, ProductState, TranscriptSegment } from "@oira/types"
import { getBridge } from "../bridge/oira"
import type { GenerateNoteIssue } from "../../shared/types/oira-api"
import type { NoteVerificationResult } from "../../shared/types/note-verification"
import { startMicCapture, type MicCapture } from "../lib/micCapture"
import {
  canTransition,
  createMachine,
  reduceMachine,
  type MachineSnapshot,
} from "./encounterMachine"

export type UnvalidatedDraft = {
  text: string
  issues: GenerateNoteIssue[]
}

type EncounterView = {
  productState: ProductState
  label: string
  visitType: string
  informed: boolean
  recordingStartedAt: number | null
  captureStarting: boolean
  encounter: Encounter | null
  transcript: TranscriptSegment[]
  note: ClinicalNote | null
  /** Intento crudo del generador que no pasó el contrato estricto. */
  unvalidatedDraft: UnvalidatedDraft | null
  /**
   * Revisión del segundo agente Qwen (F3). Informativa: el borrador NUNCA se
   * acepta solo por las observaciones; el médico decide (principio invariable).
   */
  reviewerResult: NoteVerificationResult | null
  reviewing: boolean
  errorMessage: string | null
  copied: boolean
  setLabel: (value: string) => void
  setVisitType: (value: string) => void
  setInformed: (value: boolean) => void
  prepareRecording: () => Promise<void>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  editNote: (sectionId: keyof ClinicalNote["sections"], text: string) => void
  toggleReviewed: (sectionId: keyof ClinicalNote["sections"], reviewed: boolean) => void
  acceptNote: (clinicianConfirmed: true) => Promise<void>
  exportNote: (format?: "txt" | "json" | "pdf" | "fhir", presentation?: "sections" | "soap") => Promise<void>
  reset: () => void
}

export function useEncounter(): EncounterView {
  const bridge = useMemo(() => getBridge(), [])
  const [machine, setMachine] = useState<MachineSnapshot>(() => createMachine())
  const [label, setLabel] = useState("")
  const [visitType, setVisitType] = useState("")
  const [informed, setInformed] = useState(false)
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [captureStarting, setCaptureStarting] = useState(false)
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [note, setNote] = useState<ClinicalNote | null>(null)
  const [unvalidatedDraft, setUnvalidatedDraft] = useState<UnvalidatedDraft | null>(null)
  const [reviewerResult, setReviewerResult] = useState<NoteVerificationResult | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const captureRef = useRef<MicCapture | null>(null)
  // Guards against concurrent double-clicks and stale async completions
  // after reset()/unmount (last-write-wins resurrections).
  const generationRef = useRef(0)
  const startInFlightRef = useRef(false)
  const stopInFlightRef = useRef(false)
  const acceptInFlightRef = useRef(false)

  const apply = useCallback((event: Parameters<typeof reduceMachine>[1]) => {
    setMachine((current) => {
      if (!canTransition(current.state, event)) return current
      return reduceMachine(current, event)
    })
  }, [])

  const fail = useCallback((message: string) => {
    setErrorMessage(message)
    setMachine((current) => {
      if (current.state === "ERROR") return current
      if (!canTransition(current.state, "FAIL")) return current
      return reduceMachine(current, "FAIL")
    })
  }, [])

  const startRecording = useCallback(async () => {
    if (captureStarting || startInFlightRef.current) return
    startInFlightRef.current = true
    setCaptureStarting(true)
    const generation = generationRef.current
    try {
      const started = await bridge.startEncounter({ label, visitType })
      if (generation !== generationRef.current) return
      try {
        captureRef.current = await startMicCapture({
          onChunk: (pcm, sequence) =>
            bridge.appendAudio({
              encounterId: started.encounterId,
              sequence,
              pcm,
            }).catch(() => undefined).then(() => undefined),
        })
      } catch {
        await bridge.stopEncounter(started.encounterId).catch(() => undefined)
        fail("No se pudo usar el micrófono.")
        return
      }
      if (generation !== generationRef.current) {
        await bridge.stopEncounter(started.encounterId).catch(() => undefined)
        return
      }
      setEncounter({
        id: started.encounterId,
        startedAt: started.startedAt,
        label,
        visitType,
        transcript: [],
        note: null,
      })
      setRecordingStartedAt(Date.now())
      setCopied(false)
      apply("START")
    } catch {
      fail("No se pudo iniciar la consulta.")
    } finally {
      startInFlightRef.current = false
      setCaptureStarting(false)
    }
  }, [apply, bridge, captureStarting, fail, label, visitType])

  const prepareRecording = useCallback(() => {
    return bridge.warmTranscription()
  }, [bridge])

  const stopRecording = useCallback(async () => {
    if (!encounter || stopInFlightRef.current) return
    stopInFlightRef.current = true
    const generation = generationRef.current
    const encounterId = encounter.id
    let transcriptReceived = false
    const unsubscribe = bridge.onInferenceProgress((event) => {
      if (event.encounterId !== encounterId) return
      if (generation !== generationRef.current) return
      if (event.phase === "structuring") {
        if (event.transcript) {
          transcriptReceived = true
          setTranscript(event.transcript)
        }
        apply("TRANSCRIBE_DONE")
      }
      if (event.phase === "reviewing") setReviewing(true)
      if (event.phase === "failed") {
        if (event.transcript) {
          transcriptReceived = true
          setTranscript(event.transcript)
        }
        fail(
          event.stage === "structuring"
            ? "No pudimos organizar el borrador. La transcripción queda disponible para revisión."
            : "No pudimos transcribir esta consulta. Puedes reintentar.",
        )
      }
    })
    try {
      if (captureRef.current) {
        await captureRef.current.stop()
        captureRef.current = null
      }
      await bridge.stopEncounter(encounterId)
      if (generation !== generationRef.current) return
      setRecordingStartedAt(null)
      apply("STOP")
      const generated = await bridge.generateNote(encounterId)
      if (generation !== generationRef.current) return
      setReviewing(false)
      setTranscript(generated.transcript)
      if (generated.cleanup) setErrorMessage("La eliminación local del audio queda pendiente de reintento.")
      if (generated.status !== "draft_unvalidated") {
        setUnvalidatedDraft(null)
        setNote(generated.note)
        // F3: la revisión del segundo Qwen es informativa y nunca bloquea la
        // nota; el médico la ve al revisar y decide.
        setReviewerResult(generated.reviewerResult ?? null)
      } else {
        // Borrador no validado visible: la transcripción ya está en pantalla,
        // el intento crudo queda expuesto y la máquina ya está en ERROR por el
        // evento progress "failed" — nunca una nota aparentemente válida.
        setUnvalidatedDraft({ text: generated.draftText, issues: generated.issues })
        setNote(null)
        setReviewerResult(null)
        fail("El borrador no superó la validación. Revisa la transcripción.")
        return
      }
      setMachine((current) => {
        let next = current
        if (next.state === "TRANSCRIBING") next = reduceMachine(next, "TRANSCRIBE_DONE")
        if (next.state === "STRUCTURING") next = reduceMachine(next, "STRUCTURE_DONE")
        return next
      })
    } catch {
      if (generation !== generationRef.current) return
      setReviewing(false)
      fail(
        transcriptReceived
          ? "No pudimos organizar el borrador. La transcripción queda disponible para revisión."
          : "No pudimos transcribir esta consulta. Puedes reintentar.",
      )
    } finally {
      stopInFlightRef.current = false
      unsubscribe()
    }
  }, [apply, bridge, encounter, fail])

  const editNote = useCallback((sectionId: keyof ClinicalNote["sections"], text: string) => {
    setNote((current) => {
      if (!current) return current
      const trimmed = text.trim()
      return {
        sections: {
          ...current.sections,
          [sectionId]: {
            ...current.sections[sectionId],
            text,
            provenance: "CLINICIAN_EDITED",
            sourceSegmentIds: [],
            // An emptied field is NOT_STATED, never a sourceless STATED claim.
            presence: trimmed ? "STATED" : "NOT_STATED",
          },
        },
      }
    })
    setMachine((current) => {
      if (current.state === "READY_FOR_REVIEW" || current.state === "ACCEPTED") {
        return reduceMachine(current, "EDIT")
      }
      return current
    })
  }, [])

  const toggleReviewed = useCallback(
    (sectionId: keyof ClinicalNote["sections"], reviewed: boolean) => {
      setNote((current) => {
        if (!current) return current
        return {
          sections: {
            ...current.sections,
            [sectionId]: {
              ...current.sections[sectionId],
              reviewed,
            },
          },
        }
      })
    },
    [],
  )

  const acceptNote = useCallback(async (clinicianConfirmed: true) => {
    if (!encounter || !note || acceptInFlightRef.current) return
    acceptInFlightRef.current = true
    const generation = generationRef.current
    try {
      const saved = await bridge.saveNote(encounter.id, note, clinicianConfirmed)
      if (generation !== generationRef.current) return
      if (saved.status === "PERSISTED_TRANSITION_PENDING") {
        setErrorMessage("La nota se guardó, pero su estado requiere reconciliación. Reintenta guardar.")
        return
      }
      apply("ACCEPT")
    } catch {
      if (generation !== generationRef.current) return
      fail("No se pudo guardar el borrador.")
    } finally {
      acceptInFlightRef.current = false
    }
  }, [apply, bridge, encounter, fail, note])

  const exportNote = useCallback(async (
    format: "txt" | "json" | "pdf" | "fhir" = "txt",
    presentation?: "sections" | "soap",
  ) => {
    if (!encounter) return
    try {
      await bridge.exportNote(encounter.id, format, presentation)
    } catch (error) {
      if (format !== "txt") throw error
      // txt export failed: do not mark as exported/copied (no false positive).
      fail("No se pudo copiar el borrador.")
      return
    }
    setMachine((current) => {
      if (!canTransition(current.state, "EXPORT")) return current
      return reduceMachine(current, "EXPORT")
    })
    if (format === "txt") setCopied(true)
  }, [bridge, encounter, fail])

  const reset = useCallback(() => {
    // Invalidate any in-flight start/stop/generate/save completions.
    generationRef.current += 1
    startInFlightRef.current = false
    stopInFlightRef.current = false
    acceptInFlightRef.current = false
    if (captureRef.current) {
      void captureRef.current.stop().catch(() => undefined)
      captureRef.current = null
    }
    setMachine(createMachine())
    setLabel("")
    setVisitType("")
    setInformed(false)
    setRecordingStartedAt(null)
    setEncounter(null)
    setTranscript([])
    setNote(null)
    setUnvalidatedDraft(null)
    setReviewerResult(null)
    setReviewing(false)
    setErrorMessage(null)
    setCopied(false)
  }, [])

  return {
    productState: machine.state,
    label,
    visitType,
    informed,
    recordingStartedAt,
    captureStarting,
    encounter,
    transcript,
    note,
    unvalidatedDraft,
    reviewerResult,
    reviewing,
    errorMessage,
    copied,
    setLabel,
    setVisitType,
    setInformed,
    prepareRecording,
    startRecording,
    stopRecording,
    editNote,
    toggleReviewed,
    acceptNote,
    exportNote,
    reset,
  }
}
