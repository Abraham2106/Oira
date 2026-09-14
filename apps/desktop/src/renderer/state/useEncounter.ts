import { useCallback, useMemo, useRef, useState } from "react"
import type { ClinicalNote, Encounter, ProductState, TranscriptSegment } from "@oira/types"
import { getBridge } from "../bridge/oira"
import type { GenerateNoteIssue } from "../../shared/types/oira-api"
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
  errorMessage: string | null
  copied: boolean
  setLabel: (value: string) => void
  setVisitType: (value: string) => void
  setInformed: (value: boolean) => void
  prepareRecording: () => void
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  editNote: (sectionId: keyof ClinicalNote["sections"], text: string) => void
  toggleReviewed: (sectionId: keyof ClinicalNote["sections"], reviewed: boolean) => void
  acceptNote: (clinicianConfirmed: true) => Promise<void>
  exportNote: () => Promise<void>
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const captureRef = useRef<MicCapture | null>(null)

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
      return reduceMachine(current, "FAIL")
    })
  }, [])

  const startRecording = useCallback(async () => {
    if (captureStarting) return
    setCaptureStarting(true)
    try {
      const started = await bridge.startEncounter({ label, visitType })
      try {
        captureRef.current = await startMicCapture({
          onChunk: (pcm, sequence) =>
            bridge.appendAudio({
              encounterId: started.encounterId,
              sequence,
              pcm,
            }),
        })
      } catch {
        await bridge.stopEncounter(started.encounterId).catch(() => undefined)
        fail("No se pudo usar el micrófono.")
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
      setCaptureStarting(false)
    }
  }, [apply, bridge, captureStarting, fail, label, visitType])

  const prepareRecording = useCallback(() => {
    // Loading is deliberately non-blocking: only the dedicated record button
    // may request microphone access and create the encounter.
    void bridge.warmTranscription().catch(() => undefined)
  }, [bridge])

  const stopRecording = useCallback(async () => {
    if (!encounter) return
    let transcriptReceived = false
    const unsubscribe = bridge.onInferenceProgress((event) => {
      if (event.encounterId !== encounter.id) return
      if (event.phase === "structuring") {
        if (event.transcript) {
          transcriptReceived = true
          setTranscript(event.transcript)
        }
        apply("TRANSCRIBE_DONE")
      }
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
      await bridge.stopEncounter(encounter.id)
      setRecordingStartedAt(null)
      apply("STOP")
      const generated = await bridge.generateNote(encounter.id)
      setTranscript(generated.transcript)
      if (generated.status === "ok") {
        setUnvalidatedDraft(null)
        setNote(generated.note)
      } else {
        // Borrador no validado visible: la transcripción ya está en pantalla,
        // el intento crudo queda expuesto y la máquina ya está en ERROR por el
        // evento progress "failed" — nunca una nota aparentemente válida.
        setUnvalidatedDraft({ text: generated.draftText, issues: generated.issues })
        setNote(null)
      }
      setMachine((current) => {
        let next = current
        if (next.state === "TRANSCRIBING") next = reduceMachine(next, "TRANSCRIBE_DONE")
        if (next.state === "STRUCTURING") next = reduceMachine(next, "STRUCTURE_DONE")
        return next
      })
    } catch {
      fail(
        transcriptReceived || transcript.length > 0
          ? "No pudimos organizar el borrador. La transcripción queda disponible para revisión."
          : "No pudimos transcribir esta consulta. Puedes reintentar.",
      )
    } finally {
      unsubscribe()
    }
  }, [apply, bridge, encounter, fail, transcript])

  const editNote = useCallback((sectionId: keyof ClinicalNote["sections"], text: string) => {
    setNote((current) => {
      if (!current) return current
      return {
        sections: {
          ...current.sections,
          [sectionId]: {
            ...current.sections[sectionId],
            text,
            presence: text.trim() ? "STATED" : current.sections[sectionId].presence,
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
    if (!encounter || !note) return
    try {
      await bridge.saveNote(encounter.id, note, clinicianConfirmed)
      apply("ACCEPT")
    } catch {
      fail("No se pudo guardar el borrador.")
    }
  }, [apply, bridge, encounter, fail, note])

  const exportNote = useCallback(async () => {
    if (encounter) {
      try {
        await bridge.exportNote(encounter.id, "txt")
      } catch {
        // File export requires an accepted note; clipboard copy still proceeds.
      }
    }
    apply("EXPORT")
    setCopied(true)
  }, [apply, bridge, encounter])

  const reset = useCallback(() => {
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
