import { describe, expect, it } from "vitest"
import { createEncounterService } from "../encounters"
import { createMemoryEncounterRepository } from "../encounters/encounter.repository"
import type { EncounterRecord } from "../encounters/encounter.types"
import { createMemoryTranscriptRepository } from "../transcription"
import { bodyForExport } from "../export"
import { createNotesService } from "./notes.service"
import { createMemoryNotesRepository } from "./notes.repository"
import { isAppError } from "../utils/app-error"
import { isApprovedNote, isDraftNote, type DraftNote } from "../../shared/types/notes"

const ENCOUNTER_ID = "11111111-1111-4111-8111-111111111111"
const TRANSCRIPT_ID = "22222222-2222-4222-8222-222222222222"
const NOTE_ID = "33333333-3333-4333-8333-333333333333"
const DRAFT_ID = "44444444-4444-4444-8444-444444444444"
const APPROVED_ID = "55555555-5555-4555-8555-555555555555"

function transcribedEncounter(): EncounterRecord {
  return {
    id: ENCOUNTER_ID,
    status: "transcribed",
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:01.000Z",
    endedAt: "2026-01-01T00:01:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    completedAt: null,
    transcriptId: TRANSCRIPT_ID,
  }
}

async function setupNotes(options?: {
  complete?: (input: { prompt: string; transcriptText: string }) => Promise<string>
}) {
  const encounterRepo = createMemoryEncounterRepository()
  await encounterRepo.insert(transcribedEncounter())
  const encounters = createEncounterService({ repository: encounterRepo })
  const transcripts = createMemoryTranscriptRepository()
  await transcripts.insert({
    id: TRANSCRIPT_ID,
    encounterId: ENCOUNTER_ID,
    text: "Dolor de rodilla de ejemplo.",
    segments: [
      {
        id: "seg-1",
        text: "Dolor de rodilla de ejemplo.",
        startMs: 0,
        endMs: 1000,
      },
    ],
  })
  const notesRepo = createMemoryNotesRepository()
  let nextId = 0
  const ids = [NOTE_ID, DRAFT_ID, APPROVED_ID]
  const notes = createNotesService({
    encounters,
    transcripts,
    notes: notesRepo,
    model: {
      complete: options?.complete ?? (async () => "{}"),
    },
    createId: () => ids[nextId++] ?? crypto.randomUUID(),
    nowIso: () => "2026-01-01T00:03:00.000Z",
  })
  return { notes, notesRepo, encounters }
}

describe("createNotesService", () => {
  it("returns a DraftNote, not an approved document", async () => {
    const { notes } = await setupNotes()
    const { draft } = await notes.generate(ENCOUNTER_ID)
    expect(draft.kind).toBe("draft")
    expect(isDraftNote(draft)).toBe(true)
    expect(isApprovedNote(draft)).toBe(false)
    expect(() => bodyForExport(draft)).toThrow()
  })

  it("keeps the draft row when the physician approves a new version", async () => {
    const { notes, notesRepo, encounters } = await setupNotes()
    await notes.generate(ENCOUNTER_ID)
    const saved = await notes.save({
      encounterId: ENCOUNTER_ID,
      body: "Nota revisada por el médico.",
    })
    expect(saved.noteId).toBe(APPROVED_ID)
    const stored = await notesRepo.getByEncounterId(ENCOUNTER_ID)
    expect(stored?.versions).toHaveLength(2)
    expect(stored?.versions.map((row) => row.kind)).toEqual(["draft", "approved"])
    expect(stored?.note.currentVersionId).toBe(DRAFT_ID)
    expect(stored?.note.approvedVersionId).toBe(APPROVED_ID)
    expect((await encounters.get(ENCOUNTER_ID)).status).toBe("completed")
  })

  it("fails closed when model output does not match the schema", async () => {
    const { notes, encounters } = await setupNotes({
      complete: async () => "not-json",
    })
    await expect(notes.generate(ENCOUNTER_ID)).rejects.toSatisfy(
      (error: unknown) =>
        isAppError(error) && error.code === "INVALID_STRUCTURED_OUTPUT",
    )
    expect((await encounters.get(ENCOUNTER_ID)).status).toBe("failed")
  })

  it("does not invent facts when the model omits them", async () => {
    const { notes } = await setupNotes({ complete: async () => "{}" })
    const { draft } = await notes.generate(ENCOUNTER_ID)
    expect(draft.facts).toEqual({})
    expect(draft.body).toBe("")
  })
})

describe("bodyForExport", () => {
  it("accepts only ApprovedNote", () => {
    const draft: DraftNote = {
      kind: "draft",
      id: DRAFT_ID,
      encounterId: ENCOUNTER_ID,
      facts: {},
      body: "borrador",
      model: { name: "mock", promptVersion: "v1-placeholder" },
      generatedAt: "2026-01-01T00:00:00.000Z",
    }
    expect(() => bodyForExport(draft)).toThrow()
    expect(
      bodyForExport({
        kind: "approved",
        id: APPROVED_ID,
        encounterId: ENCOUNTER_ID,
        body: "nota final",
        approvedBy: "local-user",
        approvedAt: "2026-01-01T00:00:00.000Z",
        derivedFromDraftId: DRAFT_ID,
      }),
    ).toBe("nota final")
  })
})
