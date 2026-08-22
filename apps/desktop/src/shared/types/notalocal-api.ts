import type { EncounterStatus } from "../constants/encounter-status"
import type {
  GenerateNoteInput,
  SaveNoteInput,
  StartEncounterInput,
  StopEncounterInput,
} from "../schemas/ipc.schema"
import type { Result } from "./result"

export type DraftNote = {
  encounterId: string
  body: string
}

export type StartEncounterResult = {
  encounterId: string
}

export type StopEncounterResult = {
  status: EncounterStatus
}

export type GenerateNoteResult = {
  draft: DraftNote
}

export type SaveNoteResult = {
  noteId: string
}

/**
 * IPC contract Justin owns (guide §10.2). Renderer must re-export this,
 * not declare a parallel NotaLocalBridge in packages/types.
 */
export type NotaLocalAPI = {
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
