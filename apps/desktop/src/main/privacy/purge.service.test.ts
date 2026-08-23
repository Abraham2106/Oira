import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { createAudioService } from "../audio"
import { createMemoryEncounterRepository } from "../encounters/encounter.repository"
import type { EncounterRecord } from "../encounters/encounter.types"
import { createMemoryNotesRepository } from "../notes/notes.repository"
import { createMemoryTranscriptRepository } from "../transcription"
import { createPurgeService } from "./purge.service"

const ID = "11111111-1111-4111-8111-111111111111"

function record(): EncounterRecord {
  return {
    id: ID,
    status: "discarded",
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:01.000Z",
    endedAt: "2026-01-01T00:01:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    completedAt: null,
    transcriptId: "22222222-2222-4222-8222-222222222222",
  }
}

describe("createPurgeService", () => {
  it("removes sqlite rows and audio files for an encounter", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-purge-"))
    const audio = createAudioService(audioTempDir)
    await mkdir(join(audioTempDir, ID), { recursive: true })
    await writeFile(join(audioTempDir, ID, "capture.wav"), "x")

    const encounters = createMemoryEncounterRepository()
    await encounters.insert(record())
    const transcripts = createMemoryTranscriptRepository()
    await transcripts.insert({
      id: "22222222-2222-4222-8222-222222222222",
      encounterId: ID,
      text: "secret transcript",
      segments: [],
    })
    const notes = createMemoryNotesRepository()
    await notes.insertNote({
      id: "33333333-3333-4333-8333-333333333333",
      encounterId: ID,
      currentVersionId: null,
      approvedVersionId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })

    const purge = createPurgeService({ audio, encounters, transcripts, notes })
    await purge.purgeEncounter(ID)

    expect(await encounters.getById(ID)).toBeUndefined()
    expect(await transcripts.getByEncounterId(ID)).toBeUndefined()
    expect(await notes.getByEncounterId(ID)).toBeUndefined()
    expect(await audio.listEncounterIds()).toEqual([])
    expect(await purge.inventory()).toEqual({
      encounters: 0,
      transcripts: 0,
      notes: 0,
      audioDirs: 0,
    })
  })

  it("deletes audio dirs with no matching encounter", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-orphan-"))
    const audio = createAudioService(audioTempDir)
    await mkdir(join(audioTempDir, ID), { recursive: true })
    const purge = createPurgeService({
      audio,
      encounters: createMemoryEncounterRepository(),
      transcripts: createMemoryTranscriptRepository(),
      notes: createMemoryNotesRepository(),
    })
    const result = await purge.recoverOrphans()
    expect(result.orphanAudioDirs).toBe(1)
    expect(await audio.listEncounterIds()).toEqual([])
  })
})
