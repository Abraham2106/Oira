import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import { invalidStructuredOutputError } from "../errors/notes"
import { createNotesService } from "./notes.service"
import { createMockStructuring, createMockTranscription } from "../inference/mock"
import type { StructuringPort, TranscriptionPort } from "../inference/port"
import { modelNotReadyError } from "../errors/inference"
import { createAudioTempStore } from "../audio"
import {
  createEncounterService,
  createMemoryEncounterRepository,
} from "../encounters"
import type { EncounterRepository } from "../encounters/encounter.repository"
import { createMemoryNoteStore } from "../storage/memory.store"
import type { InferenceProgress } from "../../shared/types/inference-progress"

function createUnavailableQvacPorts(): {
  transcription: TranscriptionPort
  structuring: StructuringPort
} {
  return {
    transcription: {
      async transcribe() {
        throw modelNotReadyError()
      },
    },
    structuring: {
      async structure() {
        throw modelNotReadyError()
      },
    },
  }
}

const ENCOUNTER = "00000000-0000-4000-8000-000000000001"
const dirs: string[] = []

async function generateOk(
  notes: ReturnType<typeof createNotesService>,
  encounterId = ENCOUNTER,
): Promise<Extract<Awaited<ReturnType<typeof notes.generate>>, { status: "READY" }>> {
  const generated = await notes.generate(encounterId)
  if (generated.status !== "READY") throw new Error("Se esperaba un borrador ok")
  return generated
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

async function recordingEncounter(): Promise<{
  repository: EncounterRepository
  encounterId: string
}> {
  const repository = createMemoryEncounterRepository()
  const encounters = createEncounterService({ repository })
  const started = await encounters.start({})
  await encounters.stop(started.encounterId)
  return { repository, encounterId: started.encounterId }
}

describe("createNotesService", () => {
  it("orchestrates mock ports into a seven-section draft", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
    })
    const generated = await generateOk(notes)
    expect(generated.transcript).toHaveLength(3)
    expect(Object.keys(generated.note.sections)).toHaveLength(7)
  })

  it("rejects a note that cites a missing segment", async () => {
    const broken: StructuringPort = {
      async structure() {
        const note = syntheticClinicalNote()
        note.sections.visit_context.sourceSegmentIds = ["no-such-seg"]
        return { kind: "note", note }
      },
    }
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: broken,
    })
    await expect(notes.generate(ENCOUNTER)).rejects.toMatchObject(
      invalidStructuredOutputError(),
    )
  })

  it("does not invent a draft when on-device inference is unavailable", async () => {
    const notes = createNotesService({
      ...createUnavailableQvacPorts(),
    })
    await expect(notes.generate(ENCOUNTER)).rejects.toMatchObject({
      code: "MODEL_NOT_READY",
    })
  })

  it("emits transcribing then structuring on success", async () => {
    const phases: InferenceProgress["phase"][] = []
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      progress: { emit: (event) => phases.push(event.phase) },
    })
    await generateOk(notes)
    expect(phases).toEqual(["transcribing", "structuring"])
  })

  it("emits failed and purges the wav when inference is unavailable", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-notes-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    audio.prepare(ENCOUNTER)
    audio.append(ENCOUNTER, Buffer.alloc(320), 0)
    audio.finalize(ENCOUNTER)
    expect(audio.wavPath(ENCOUNTER)).not.toBeNull()

    const phases: InferenceProgress["phase"][] = []
    const notes = createNotesService({
      ...createUnavailableQvacPorts(),
      audio,
      progress: { emit: (event) => phases.push(event.phase) },
    })
    await expect(notes.generate(ENCOUNTER)).rejects.toMatchObject({
      code: "MODEL_NOT_READY",
    })
    expect(phases).toEqual(["transcribing", "failed"])
    expect(audio.wavPath(ENCOUNTER)).toBeNull()
    expect(existsSync(join(audioTempDir, ENCOUNTER))).toBe(false)
  })

  it("purges the wav after a successful generate", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-notes-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    audio.prepare(ENCOUNTER)
    audio.append(ENCOUNTER, Buffer.alloc(320), 0)
    audio.finalize(ENCOUNTER)

    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      audio,
    })
    await generateOk(notes)
    expect(existsSync(join(audioTempDir, ENCOUNTER))).toBe(false)
  })

  it("keeps a useful draft and retries a failed purge without re-running inference", async () => {
    const purge = vi.fn()
      .mockImplementationOnce(() => { throw new Error("purge failed") })
      .mockImplementation(() => undefined)
    const transcribe = vi.fn(createMockTranscription().transcribe)
    const structure = vi.fn(createMockStructuring().structure)
    const notes = createNotesService({
      transcription: { transcribe },
      structuring: { structure },
      audio: {
        prepare() {}, append() {}, finalize: () => "synthetic.wav",
        wavPath: () => "synthetic.wav", purge,
      },
    })

    await expect(notes.generate(ENCOUNTER)).resolves.toMatchObject({
      status: "CLEANUP_PENDING",
      cleanup: { retryable: true },
      note: expect.any(Object),
    })
    await expect(notes.retryAudioCleanup(ENCOUNTER)).resolves.toEqual({ cleaned: true })
    expect(transcribe).toHaveBeenCalledTimes(1)
    expect(structure).toHaveBeenCalledTimes(1)
    expect(purge).toHaveBeenCalledTimes(2)
  })

  it("keeps the primary inference error when cleanup fails, while retaining a cleanup retry", async () => {
    const purge = vi.fn()
      .mockImplementationOnce(() => { throw new Error("purge failed") })
      .mockImplementation(() => undefined)
    const notes = createNotesService({
      transcription: { async transcribe() { throw invalidStructuredOutputError() } },
      structuring: createMockStructuring(),
      audio: {
        prepare() {}, append() {}, finalize: () => "synthetic.wav",
        wavPath: () => "synthetic.wav", purge,
      },
    })

    await expect(notes.generate(ENCOUNTER)).rejects.toMatchObject(
      invalidStructuredOutputError(),
    )
    await expect(notes.retryAudioCleanup(ENCOUNTER)).resolves.toEqual({ cleaned: true })
    expect(purge).toHaveBeenCalledTimes(2)
  })

  it("reports persisted state when the post-save encounter transition fails", async () => {
    const store = createMemoryNoteStore()
    let advanceCalls = 0
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
      encounters: {
        async start() { return { encounterId: ENCOUNTER, startedAt: "" } },
        async stop() { return { status: "recording" as const } },
        async getById() {
          return { id: ENCOUNTER, status: "transcribed" as const, createdAt: "", startedAt: "", endedAt: "", updatedAt: "", completedAt: null, transcriptId: null, label: "", visitType: "" }
        },
        async advance() {
          advanceCalls += 1
          if (advanceCalls > 1) throw new Error("transition failed")
        },
      },
    })
    const generated = await notes.generate(ENCOUNTER)
    if (generated.status === "draft_unvalidated") throw new Error("Expected validated draft")
    await expect(notes.save({ encounterId: ENCOUNTER, note: generated.note, clinicianConfirmed: true }))
      .resolves.toMatchObject({ status: "PERSISTED_TRANSITION_PENDING", noteId: expect.any(String) })
    expect(await store.list()).toHaveLength(1)
  })

  it("retries a persisted transition with the existing note id after reconciliation", async () => {
    const store = createMemoryNoteStore()
    let status: "transcribing" | "transcribed" | "drafting" | "drafted" = "transcribing"
    let failDrafting = true
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
      createId: () => "stable-note-id",
      encounters: {
        async start() { return { encounterId: ENCOUNTER, startedAt: "" } },
        async stop() { return { status: "recording" as const } },
        async getById() {
          return { id: ENCOUNTER, status, createdAt: "", startedAt: "", endedAt: "", updatedAt: "", completedAt: null, transcriptId: null, label: "", visitType: "" }
        },
        async advance(_encounterId, to) {
          if (to === "transcribed") { status = "transcribed"; return }
          if (to === "drafting" && failDrafting) throw new Error("transition failed")
          if (to === "drafting") { status = "drafting"; return }
          status = "drafted"
        },
      },
    })
    const generated = await notes.generate(ENCOUNTER)
    if (generated.status === "draft_unvalidated") throw new Error("Expected validated draft")
    const first = await notes.save({ encounterId: ENCOUNTER, note: generated.note, clinicianConfirmed: true })
    expect(first).toMatchObject({ status: "PERSISTED_TRANSITION_PENDING", noteId: "stable-note-id" })
    failDrafting = false
    const second = await notes.save({ encounterId: ENCOUNTER, note: generated.note, clinicianConfirmed: true })
    expect(second).toEqual({ status: "SAVED", noteId: "stable-note-id" })
    expect(await store.list()).toHaveLength(1)
  })

  it("fails closed when an audio store is present but there is no wav", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-notes-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      audio,
    })
    await expect(notes.generate(ENCOUNTER)).rejects.toMatchObject({
      code: "AUDIO_CAPTURE_FAILED",
    })
  })

  it("marks a failed generate as failed so the encounter stops blocking start", async () => {
    const { repository, encounterId } = await recordingEncounter()
    const encounters = createEncounterService({ repository })
    const notes = createNotesService({
      ...createUnavailableQvacPorts(),
      encounters: createEncounterService({ repository }),
    })
    await expect(notes.generate(encounterId)).rejects.toMatchObject({
      code: "MODEL_NOT_READY",
    })
    expect((await repository.getById(encounterId))?.status).toBe("failed")
    await expect(encounters.start({})).resolves.toMatchObject({
      encounterId: expect.any(String),
    })
  })

  it("marks a successful generate as transcribed and save as drafted", async () => {
    const { repository, encounterId } = await recordingEncounter()
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      encounters: createEncounterService({ repository }),
      notes: store,
    })
    const generated = await generateOk(notes, encounterId)
    expect((await repository.getById(encounterId))?.status).toBe("transcribed")
    await notes.save({ encounterId, note: generated.note, clinicianConfirmed: true })
    expect((await repository.getById(encounterId))?.status).toBe("drafted")
  })

  it("persists the accepted note through NoteStorePort", async () => {
    const { repository, encounterId } = await recordingEncounter()
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      encounters: createEncounterService({ repository }),
      notes: store,
    })
    const generated = await generateOk(notes, encounterId)
    const saved = await notes.save({
      encounterId,
      note: generated.note,
      clinicianConfirmed: true,
    })
    const stored = await store.get(saved.noteId)
    expect(stored?.encounterId).toBe(encounterId)
    expect(stored?.note).toEqual(generated.note)
    expect(stored?.transcript).toHaveLength(3)
    expect(stored?.transcript).toEqual(generated.transcript)
  })

  it("updates one accepted note when the clinician accepts again", async () => {
    const { repository, encounterId } = await recordingEncounter()
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      encounters: createEncounterService({ repository }),
      notes: store,
      createId: () => "stable-note-id",
      clock: { nowIso: () => "2026-09-11T12:00:00.000Z" },
    })
    const generated = await generateOk(notes, encounterId)
    const first = await notes.save({
      encounterId,
      note: generated.note,
      clinicianConfirmed: true,
    })
    const secondNote = structuredClone(generated.note)
    secondNote.sections.clinical_narrative.text = "Contenido editado."
    const second = await notes.save({
      encounterId,
      note: secondNote,
      clinicianConfirmed: true,
    })

    expect(second.noteId).toBe(first.noteId)
    const stored = await store.list()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.note.sections.clinical_narrative.text).toBe(
      "Contenido editado.",
    )
  })

  it("serializes concurrent accepts for one encounter", async () => {
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
      createId: (() => {
        let count = 0
        return () => `note-${++count}`
      })(),
    })
    const generated = await generateOk(notes)
    const [first, second] = await Promise.all([
      notes.save({ encounterId: ENCOUNTER, note: generated.note, clinicianConfirmed: true }),
      notes.save({ encounterId: ENCOUNTER, note: generated.note, clinicianConfirmed: true }),
    ])

    expect(second.noteId).toBe(first.noteId)
    expect((await store.list()).filter((record) => record.encounterId)).toHaveLength(1)
  })

  it("rejects an invalid note shape at the service boundary", async () => {
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
    })
    await generateOk(notes)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: { sections: {} } as never,
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURED_OUTPUT" })
    expect(await store.list()).toHaveLength(0)
  })

  it("does not report success when storage fails", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: {
        save: vi.fn(async () => {
          throw new Error("disk full")
        }),
        list: vi.fn(async () => []),
        get: vi.fn(async () => null),
        remove: vi.fn(async () => undefined),
      },
    })
    await generateOk(notes)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: syntheticClinicalNote(),
        clinicianConfirmed: true,
      }),
    ).rejects.toThrow("disk full")
  })

  it("rejects save without clinician confirmation", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
    })
    await generateOk(notes)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: syntheticClinicalNote(),
        clinicianConfirmed: false as never,
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" })
  })

  it("rejects save for a missing encounter", async () => {
    let present = true
    const save = vi.fn(async () => undefined)
    const store = {
      ...createMemoryNoteStore(),
      save,
    }
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
      encounters: {
        async start() {
          return { encounterId: ENCOUNTER, startedAt: "" }
        },
        async stop() {
          return { status: "recording" as const }
        },
        async getById() {
          if (!present) return undefined
          return {
            id: ENCOUNTER,
            status: "transcribed",
            createdAt: "",
            startedAt: "",
            endedAt: "",
            updatedAt: "",
            completedAt: null,
            transcriptId: null,
            label: "",
            visitType: "",
          }
        },
        async advance() {},
      },
    })
    const generated = await generateOk(notes)
    present = false
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: generated.note,
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" })
    expect(save).not.toHaveBeenCalled()
  })

  it("rejects save without a prior generate", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: createMemoryNoteStore(),
    })
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: syntheticClinicalNote(),
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" })
  })

  it("does not report success when no note store is wired", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
    })
    await generateOk(notes)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: syntheticClinicalNote(),
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" })
  })

  it("does not let callers mutate the canonical draft transcript", async () => {
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
    })
    const generated = await generateOk(notes)
    const firstSegment = generated.transcript[0]
    expect(firstSegment).toBeDefined()
    if (!firstSegment) return
    firstSegment.id = "mutated"
    firstSegment.text = "tampered"
    const saved = await notes.save({
      encounterId: ENCOUNTER,
      note: generated.note,
      clinicianConfirmed: true,
    })
    const stored = await store.get(saved.noteId)
    expect(stored?.transcript[0]?.id).toBe("seg-1")
    expect(stored?.transcript[0]?.text).not.toBe("tampered")
  })

  it("accepts a note when section reviewed flags remain false", async () => {
    const store = createMemoryNoteStore()
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: store,
    })
    const generated = await generateOk(notes)
    expect(generated.note.sections.visit_context.reviewed).toBe(false)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: generated.note,
        clinicianConfirmed: true,
      }),
    ).resolves.toMatchObject({ noteId: expect.any(String) })
  })

  it("does not allow saving over a draft_unvalidated outcome", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: {
        structure: async () => ({
          kind: "draft_unvalidated",
          draftText: "intento crudo",
          issues: [{ code: "MISSING_SECTION", message: "Falta una sección." }],
        }),
      } as unknown as StructuringPort,
      notes: createMemoryNoteStore(),
    })
    await notes.generate(ENCOUNTER)
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: syntheticClinicalNote(),
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" })
  })

  it("rejects save when the note cites a missing draft segment", async () => {
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      notes: createMemoryNoteStore(),
    })
    await generateOk(notes)
    const broken = syntheticClinicalNote()
    broken.sections.visit_context.sourceSegmentIds = ["missing"]
    await expect(
      notes.save({
        encounterId: ENCOUNTER,
        note: broken,
        clinicianConfirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURED_OUTPUT" })
  })
})
