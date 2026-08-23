import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import { invalidStructuredOutputError } from "../errors/notes"
import { createNotesService } from "./notes.service"
import { createMockStructuring, createMockTranscription } from "../inference/mock"
import type { StructuringPort } from "../inference/port"
import { createUnavailableQvacPorts } from "../qvac/unavailable"
import { createAudioTempStore } from "../audio"
import {
  createEncounterService,
  createMemoryEncounterRepository,
} from "../encounters"
import type { EncounterRepository } from "../encounters/encounter.repository"
import type { InferenceProgress } from "../../shared/types/inference-progress"

const ENCOUNTER = "00000000-0000-4000-8000-000000000001"
const dirs: string[] = []

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
    const generated = await notes.generate(ENCOUNTER)
    expect(generated.transcript).toHaveLength(3)
    expect(Object.keys(generated.note.sections)).toHaveLength(7)
  })

  it("rejects a note that cites a missing segment", async () => {
    const broken: StructuringPort = {
      async structure() {
        const note = syntheticClinicalNote()
        note.sections.visit_context.sourceSegmentIds = ["no-such-seg"]
        return { note }
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
      onProgress: (event) => phases.push(event.phase),
    })
    await notes.generate(ENCOUNTER)
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
      onProgress: (event) => phases.push(event.phase),
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
    await notes.generate(ENCOUNTER)
    expect(existsSync(join(audioTempDir, ENCOUNTER))).toBe(false)
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
      encounters: repository,
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
    const notes = createNotesService({
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      encounters: repository,
    })
    const generated = await notes.generate(encounterId)
    expect((await repository.getById(encounterId))?.status).toBe("transcribed")
    await notes.save({ encounterId, note: generated.note })
    expect((await repository.getById(encounterId))?.status).toBe("drafted")
  })
})
