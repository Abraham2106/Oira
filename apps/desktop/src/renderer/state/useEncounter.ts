import { useCallback, useMemo, useState } from "react"
import type { ClinicalNote, Encounter, ProductState, TranscriptSegment } from "@notalocal/types"
import { getBridge } from "../bridge/notalocal"
import {
  createMachine,
  reduceMachine,
  type MachineSnapshot,
} from "./encounterMachine"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  const apply = useCallback((event: Parameters<typeof reduceMachine>[1]) => {
    setMachine((current) => reduceMachine(current, event))
  }, [])

  const fail = useCallback((message: string) => {
    setErrorMessage(message)
    setMachine((current) => reduceMachine(current, "FAIL"))
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const started = await bridge.startEncounter({ label, visitType })
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
    try {
      await bridge.stopEncounter(encounter.id)
      setRecordingStartedAt(null)
      apply("STOP")
      await wait(800)
      apply("TRANSCRIBE_DONE")
      await wait(800)
      const generated = await bridge.generateNote(encounter.id)
      setTranscript(generated.transcript)
      setNote(generated.note)
      apply("STRUCTURE_DONE")
    } catch {
      fail("No pudimos transcribir esta consulta. Puedes reintentar.")
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
    acceptNote,
    exportNote,
    reset,
  }
}
