import type { NoteRecord, NoteVersionRecord } from "./note.versioning"

export type NotesRepository = {
  getByEncounterId: (
    encounterId: string,
  ) => Promise<{ note: NoteRecord; versions: NoteVersionRecord[] } | undefined>
  insertNote: (note: NoteRecord) => Promise<void>
  insertVersion: (version: NoteVersionRecord) => Promise<void>
  updateNote: (note: NoteRecord) => Promise<void>
  deleteByEncounterId: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
}

export function createMemoryNotesRepository(): NotesRepository {
  const notes = new Map<string, NoteRecord>()
  const versions = new Map<string, NoteVersionRecord[]>()

  return {
    async getByEncounterId(encounterId) {
      const note = [...notes.values()].find((row) => row.encounterId === encounterId)
      if (!note) return undefined
      return {
        note: { ...note },
        versions: (versions.get(note.id) ?? []).map((row) => ({ ...row })),
      }
    },
    async insertNote(note) {
      notes.set(note.id, { ...note })
      versions.set(note.id, [])
    },
    async insertVersion(version) {
      const list = versions.get(version.noteId) ?? []
      list.push({ ...version })
      versions.set(version.noteId, list)
    },
    async updateNote(note) {
      notes.set(note.id, { ...note })
    },
    async deleteByEncounterId(encounterId) {
      for (const [id, note] of notes) {
        if (note.encounterId !== encounterId) continue
        notes.delete(id)
        versions.delete(id)
      }
    },
    async listEncounterIds() {
      return [...notes.values()].map((note) => note.encounterId)
    },
  }
}
