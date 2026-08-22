import {
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "../errors/notes"

export type DraftNote = {
  encounterId: string
  body: string
}

export type NotesPort = {
  generate: (encounterId: string) => Promise<{ draft: DraftNote }>
  save: (input: { encounterId: string; body: string }) => Promise<{ noteId: string }>
}

/**
 * Honest stub until I08/I09 mock inference is wired.
 * Never returns ok drafts or invented approved noteIds.
 */
export function createNotesStub(): NotesPort {
  return {
    async generate(_encounterId) {
      throw noteGenerationNotImplementedError()
    },
    async save(_input) {
      throw noteSaveNotImplementedError()
    },
  }
}
