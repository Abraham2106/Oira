import { useCallback, useMemo, useRef, useState } from "react"
import type { ClinicalNote, Encounter, ProductState, TranscriptSegment } from "@oira/types"
import { getBridge } from "../bridge/oira"
import { startMicCapture, type MicCapture } from "../lib/micCapture"
import {
  canTransition,
  createMachine,
  reduceMachine,
  type MachineSnapshot,
} from "./encounterMachine"

type EncounterView = {
  productState: ProductState
  label: string
  visitType: string
  informed: boolean
  recordingStartedAt: number | null
  encounter: Encounter | null
  transcript: TranscriptSegment[]
  note: ClinicalNote | null
  errorMessage: string | null
  copied: boolean
  setLabel: (value: string) => void
  setVisitType: (value: string) => void
  setInformed: (value: boolean) => void
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  editNote: (sectionId: keyof ClinicalNote["sections"], text: string) => void
  toggleReviewed: (sectionId: keyof ClinicalNote["sections"], reviewed: boolean) => void
  acceptNote: () => Promise<void>
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
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [note, setNote] = useState<ClinicalNote | null>(null)
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
    }
  }, [apply, bridge, fail, label, visitType])

  const stopRecording = useCallback(async () => {
    if (!encounter) return
    const unsubscribe = bridge.onInferenceProgress((event) => {
      if (event.encounterId !== encounter.id) return
      if (event.phase === "structuring") apply("TRANSCRIBE_DONE")
      if (event.phase === "failed") fail("No pudimos transcribir esta consulta. Puedes reintentar.")
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
      setNote(generated.note)
      setMachine((current) => {
        let next = current
        if (next.state === "TRANSCRIBING") next = reduceMachine(next, "TRANSCRIBE_DONE")
        if (next.state === "STRUCTURING") next = reduceMachine(next, "STRUCTURE_DONE")
        return next
      })
    } catch {
      fail("No pudimos transcribir esta consulta. Puedes reintentar.")
    } finally {
      unsubscribe()
    }
  }, [apply, bridge, encounter, fail])

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

  const acceptNote = useCallback(async () => {
    if (!encounter || !note) return
    try {
      await bridge.saveNote(encounter.id, note)
      apply("ACCEPT")
    } catch {
      fail("No se pudo guardar el borrador.")
    }
  }, [apply, bridge, encounter, fail, note])

  const exportNote = useCallback(async () => {
    apply("EXPORT")
    setCopied(true)
  }, [apply])

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
    setErrorMessage(null)
    setCopied(false)
  }, [])

  return {
    productState: machine.state,
    label,
    visitType,
    informed,
    recordingStartedAt,
    encounter,
    transcript,
    note,
    errorMessage,
    copied,
    setLabel,
    setVisitType,
    setInformed,
    startRecording,
    stopRecording,
    editNote,
    toggleReviewed,
    acceptNote,
    exportNote,
    reset,
  }
}
