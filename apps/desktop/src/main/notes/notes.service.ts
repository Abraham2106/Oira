export type DraftNote = {
  encounterId: string
  body: string
}

export type NotesPort = {
  generate: (encounterId: string) => Promise<{ draft: DraftNote }>
  save: (input: { encounterId: string; body: string }) => Promise<{ noteId: string }>
}

export function createNotesStub(): NotesPort {
  return {
    async generate(encounterId) {
      return { draft: { encounterId, body: "" } }
    },
    async save() {
      return { noteId: crypto.randomUUID() }
    },
  }
}
