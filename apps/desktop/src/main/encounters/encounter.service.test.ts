import { describe, expect, it } from "vitest"
import type { AudioPort } from "../audio"
import { isAppError } from "../utils/app-error"
import { createMemoryEncounterRepository } from "./encounter.repository"
import { createEncounterService } from "./encounter.service"
import type { EncounterRecord } from "./encounter.types"

const ID = "11111111-1111-4111-8111-111111111111"
const OTHER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const TRANSCRIPT_ID = "22222222-2222-4222-8222-222222222222"
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function transcribedRecord(overrides: Partial<EncounterRecord> = {}): EncounterRecord {
  return {
    id: ID,
    status: "transcribed",
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:01.000Z",
    endedAt: "2026-01-01T00:01:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    completedAt: null,
    transcriptId: TRANSCRIPT_ID,
    ...overrides,
  }
}

function mockAudio(overrides: Partial<AudioPort> = {}): AudioPort {
  return {
    prepare: async () => undefined,
    appendChunk: async () => undefined,
    finalize: async () => ({ wavPath: "/tmp/encounter.wav" }),
    cleanup: async () => undefined,
    listEncounterIds: async () => [],
    encounterDir: (id) => `/tmp-audio/${id}`,
    ...overrides,
  }
}

async function waitForStatus(
  encounters: ReturnType<typeof createEncounterService>,
  encounterId: string,
  status: EncounterRecord["status"],
) {
  for (let i = 0; i < 30; i += 1) {
    const record = await encounters.get(encounterId)
    if (record.status === status) return record
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`Timed out waiting for status ${status}`)
}

describe("createEncounterService", () => {
  it("create leaves the encounter in created without starting audio", async () => {
    let prepared = 0
    const encounters = createEncounterService({
      createId: () => ID,
      clock: { nowIso: () => "2026-01-01T00:00:00.000Z" },
      audio: mockAudio({
        prepare: async () => {
          prepared += 1
        },
      }),
    })

    const created = await encounters.create()
    expect(created).toMatchObject({
      id: ID,
      status: "created",
      createdAt: "2026-01-01T00:00:00.000Z",
      startedAt: null,
      endedAt: null,
      completedAt: null,
      transcriptId: null,
    })
    expect(created.createdAt).toMatch(UTC)
    expect(prepared).toBe(0)
  })

  it("start moves created → recording and prepares audio", async () => {
    let preparedFor: string | undefined
    const encounters = createEncounterService({
      createId: () => ID,
      clock: { nowIso: () => "2026-01-01T00:00:01.000Z" },
      audio: mockAudio({
        prepare: async (encounterId) => {
          preparedFor = encounterId
        },
      }),
    })

    await encounters.create()
    const started = await encounters.start(ID)
    const record = await encounters.get(started.encounterId)
    expect(record.status).toBe("recording")
    expect(record.startedAt).toBe("2026-01-01T00:00:01.000Z")
    expect(record.startedAt).toMatch(UTC)
    expect(preparedFor).toBe(ID)
  })

  it("rejects start from transcribed", async () => {
    const repository = createMemoryEncounterRepository()
    await repository.insert(transcribedRecord())
    const encounters = createEncounterService({ repository })
    await expect(encounters.start(ID)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INVALID_STATE_TRANSITION",
    )
  })

  it("refuses a second create while another encounter is recording", async () => {
    const encounters = createEncounterService({ createId: () => ID })
    await encounters.create()
    await encounters.start(ID)
    await expect(encounters.create()).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "ENCOUNTER_ACTIVE",
    )
  })

  it("refuses start of another encounter while one is recording", async () => {
    const repository = createMemoryEncounterRepository()
    const encounters = createEncounterService({
      repository,
      createId: () => ID,
    })
    await encounters.create()
    await encounters.start(ID)
    await repository.insert({
      ...transcribedRecord({
        id: OTHER,
        status: "created",
        startedAt: null,
        endedAt: null,
        transcriptId: null,
      }),
    })
    await expect(encounters.start(OTHER)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "ENCOUNTER_ACTIVE",
    )
  })

  it("stop moves recording → transcribing and then transcribed when STT finishes", async () => {
    const encounters = createEncounterService({
      createId: () => ID,
      audio: mockAudio(),
      transcription: {
        transcribe: async () => ({ transcriptId: TRANSCRIPT_ID }),
      },
    })
    await encounters.create()
    await encounters.start(ID)
    const stopped = await encounters.stop(ID)
    expect(stopped.status).toBe("transcribing")
    expect((await encounters.get(ID)).endedAt).toMatch(UTC)

    const transcribed = await waitForStatus(encounters, ID, "transcribed")
    expect(transcribed.transcriptId).toBe(TRANSCRIPT_ID)
  })

  it("capture finalize failure moves recording → failed", async () => {
    const encounters = createEncounterService({
      createId: () => ID,
      audio: mockAudio({
        finalize: async () => {
          throw new Error("disk")
        },
      }),
    })
    await encounters.create()
    await encounters.start(ID)
    await expect(encounters.stop(ID)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "AUDIO_CAPTURE_FAILED",
    )
    expect((await encounters.get(ID)).status).toBe("failed")
  })

  it("appendChunk is only allowed while recording", async () => {
    const encounters = createEncounterService({
      createId: () => ID,
      audio: mockAudio(),
    })
    await encounters.create()
    await expect(encounters.appendChunk(ID, new Uint8Array([1]))).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INVALID_STATE_TRANSITION",
    )
    await encounters.start(ID)
    await encounters.appendChunk(ID, new Uint8Array([1]))
  })

  it("discard moves a created or recording encounter to discarded", async () => {
    const encounters = createEncounterService({ createId: () => ID })
    await encounters.create()
    expect((await encounters.discard(ID)).status).toBe("discarded")
  })

  it("cannot discard a completed encounter", async () => {
    const repository = createMemoryEncounterRepository()
    await repository.insert({
      ...transcribedRecord(),
      status: "completed",
      completedAt: "2026-01-01T00:02:00.000Z",
    })
    const encounters = createEncounterService({ repository })
    await expect(encounters.discard(ID)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INVALID_STATE_TRANSITION",
    )
  })

  it("cannot complete from transcribed without drafting", async () => {
    const repository = createMemoryEncounterRepository()
    await repository.insert(transcribedRecord())
    const encounters = createEncounterService({ repository })
    await expect(encounters.markCompleted(ID)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INVALID_STATE_TRANSITION",
    )
  })

  it("relates a transcript id and completes only through drafted", async () => {
    const repository = createMemoryEncounterRepository()
    await repository.insert(transcribedRecord())
    const encounters = createEncounterService({ repository })
    expect((await encounters.get(ID)).transcriptId).toBe(TRANSCRIPT_ID)
    await encounters.beginDrafting(ID)
    expect((await encounters.get(ID)).status).toBe("drafting")
    await encounters.markDrafted(ID)
    await encounters.markCompleted(ID)
    const completed = await encounters.get(ID)
    expect(completed.status).toBe("completed")
    expect(completed.completedAt).toMatch(UTC)
  })
})
