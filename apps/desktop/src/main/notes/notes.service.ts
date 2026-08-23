import type { AudioTempStore } from "../audio"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import type { ClinicalNote } from "@oira/types"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import { audioCaptureFailedError } from "../errors/audio"
import { isAppError } from "../errors/core"
import { encounterNotFoundError } from "../errors/encounters"
import { invalidStructuredOutputError } from "../errors/notes"
import type { EncounterRepository } from "../encounters/encounter.repository"
import type { StructuringPort, TranscriptionPort } from "../inference/port"
import { verifySource } from "./verify-source"

export type NotesPort = {
  generate: (encounterId: string) => Promise<GenerateNoteResult>
  save: (input: {
    encounterId: string
    note: ClinicalNote
  }) => Promise<{ noteId: string }>
}

export type NotesServiceDeps = {
  encounters?: EncounterRepository
  createId?: () => string
}

export type NotesPipelineDeps = NotesServiceDeps & {
  transcription: TranscriptionPort
  structuring: StructuringPort
  audio?: AudioTempStore
  onProgress?: (event: InferenceProgress) => void
}

const STRUCTURE_ATTEMPTS = 2

export function createNotesStub(deps: NotesServiceDeps = {}): NotesPort {
  const saved = new Map<string, ClinicalNote>()
  const createId = deps.createId ?? (() => crypto.randomUUID())

  return {
    async generate(encounterId) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(encounterId)
        if (!record) throw encounterNotFoundError()
      }
      return {
        transcript: SYNTHETIC_TRANSCRIPT,
        note: syntheticClinicalNote(),
      }
    },
    async save(input) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(input.encounterId)
        if (!record) throw encounterNotFoundError()
      }
      saved.set(input.encounterId, input.note)
      return { noteId: createId() }
    },
  }
}

export function createNotesService(deps: NotesPipelineDeps): NotesPort {
  const saved = new Map<string, ClinicalNote>()
  const createId = deps.createId ?? (() => crypto.randomUUID())

  return {
    async generate(encounterId) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(encounterId)
        if (!record) throw encounterNotFoundError()
      }

      deps.onProgress?.({ encounterId, phase: "transcribing" })
      try {
        const filePath = deps.audio
          ? deps.audio.wavPath(encounterId)
          : undefined
        if (deps.audio && !filePath) throw audioCaptureFailedError()
        const { segments } = await deps.transcription.transcribe({
          filePath: filePath ?? "",
        })

        deps.onProgress?.({ encounterId, phase: "structuring" })
        let lastError: unknown
        for (let attempt = 0; attempt < STRUCTURE_ATTEMPTS; attempt++) {
          try {
            const { note } = await deps.structuring.structure({
              transcript: segments,
            })
            const parsed = clinicalNoteSchema.safeParse(note)
            if (!parsed.success) throw invalidStructuredOutputError()
            if (!verifySource(parsed.data, segments)) {
              throw invalidStructuredOutputError()
            }
            return { transcript: segments, note: parsed.data }
          } catch (error) {
            lastError = error
            const retryable =
              isAppError(error) && error.code === "INVALID_STRUCTURED_OUTPUT"
            if (!retryable) throw error
          }
        }
        throw lastError
      } catch (error) {
        deps.onProgress?.({ encounterId, phase: "failed" })
        throw error
      } finally {
        deps.audio?.purge(encounterId)
      }
    },
    async save(input) {
      if (deps.encounters) {
        const record = await deps.encounters.getById(input.encounterId)
        if (!record) throw encounterNotFoundError()
      }
      saved.set(input.encounterId, input.note)
      return { noteId: createId() }
    },
  }
}
