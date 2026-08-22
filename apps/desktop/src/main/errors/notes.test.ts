import { describe, expect, it } from "vitest"
import {
  noteGenerationNotImplementedError,
  noteSaveNotImplementedError,
} from "./notes"
import { createNotesStub } from "../notes/notes.service"

describe("errors/notes", () => {
  it("uses NOT_IMPLEMENTED for unfinished generate/save", () => {
    expect(noteGenerationNotImplementedError().code).toBe("NOT_IMPLEMENTED")
    expect(noteSaveNotImplementedError().code).toBe("NOT_IMPLEMENTED")
  })

  it("notes stub never returns empty clinical success", async () => {
    const notes = createNotesStub()
    await expect(notes.generate("00000000-0000-4000-8000-000000000001")).rejects.toMatchObject(
      { code: "NOT_IMPLEMENTED" },
    )
    await expect(
      notes.save({
        encounterId: "00000000-0000-4000-8000-000000000001",
        body: "x",
      }),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" })
  })
})
