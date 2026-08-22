import { describe, expect, it } from "vitest"
import {
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "./notes"
import { createNotesStub } from "../notes/notes.service"

describe("errors/notes", () => {
  it("notes stub still documents unused NOT_IMPLEMENTED constructors", () => {
    expect(noteGenerationNotImplementedError().code).toBe("NOT_IMPLEMENTED")
    expect(noteSaveNotImplementedError().code).toBe("NOT_IMPLEMENTED")
  })

  it("notes stub returns seven I4 sections and persists save", async () => {
    const notes = createNotesStub()
    const encounterId = "00000000-0000-4000-8000-000000000001"
    const generated = await notes.generate(encounterId)
    expect(Object.keys(generated.note.sections)).toHaveLength(7)
    const saved = await notes.save({
      encounterId,
      note: generated.note,
    })
    expect(saved.noteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })
})
