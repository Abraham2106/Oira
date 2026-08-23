import type { NoteRecord, NoteVersionRecord } from "../../shared/types/repositories"
import type { NotesRepository } from "../../shared/types/repositories"

export type { NotesRepository }

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
    async writeDraft({ note, version, createNote }) {
      if (createNote) notes.set(note.id, { ...note })
      const list = versions.get(version.noteId) ?? []
      list.push({ ...version })
      versions.set(version.noteId, list)
      notes.set(note.id, {
        ...note,
        currentVersionId: version.id,
        updatedAt: version.createdAt,
      })
    },
    async writeApproved({ note, version }) {
      const list = versions.get(version.noteId) ?? []
      list.push({ ...version })
      versions.set(version.noteId, list)
      notes.set(note.id, {
        ...note,
        approvedVersionId: version.id,
        updatedAt: version.createdAt,
      })
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
