import type { ClinicalNote, TranscriptSegment } from "@oira/types"
import type { EncounterStatus } from "../constants/encounter-status"
import type {
  GenerateNoteInput,
  SaveNoteInput,
  StartEncounterInput,
  StopEncounterInput,
} from "../schemas/ipc.schema"
import type { Result } from "./result"

export type StartEncounterResult = {
  encounterId: string
  startedAt: string
}

export type StopEncounterResult = {
  status: EncounterStatus
}

export type GenerateNoteResult = {
  transcript: TranscriptSegment[]
  note: ClinicalNote
}

export type SaveNoteResult = {
  noteId: string
}

/**
 * IPC contract (guide §10.2). Renderer consumes this via `window.oira`.
 * Draft notes are structured (I4 sections + transcript), not a free-text body.
 */
export type OiraApi = {
  startEncounter: (
    input?: StartEncounterInput,
  ) => Promise<Result<StartEncounterResult>>
  stopEncounter: (
    input: StopEncounterInput,
  ) => Promise<Result<StopEncounterResult>>
  generateNote: (
    input: GenerateNoteInput,
  ) => Promise<Result<GenerateNoteResult>>
  saveNote: (input: SaveNoteInput) => Promise<Result<SaveNoteResult>>
}
