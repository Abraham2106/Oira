import { describe, expect, it } from "vitest"
import { createEncounterService } from "./encounter.service"
import { createMemoryEncounterRepository } from "./encounter.repository"
import type { EncounterRecord } from "./encounter.types"
import { isAppError } from "../utils/app-error"

const ID = "11111111-1111-4111-8111-111111111111"

function transcribedRecord(): EncounterRecord {
  return {
    id: ID,
    status: "transcribed",
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:01.000Z",
    endedAt: "2026-01-01T00:01:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    completedAt: null,
    transcriptId: "22222222-2222-4222-8222-222222222222",
  }
}

describe("createEncounterService", () => {
  it("get returns the current encounter record", async () => {
    const encounters = createEncounterService({
      createId: () => ID,
      clock: { nowIso: () => "2026-01-01T00:00:00.000Z" },
    })
    const { encounterId } = await encounters.start()
    const record = await encounters.get(encounterId)
    expect(record).toMatchObject({
      id: ID,
      status: "recording",
      transcriptId: null,
    })
  })

  it("discard moves a recording encounter to discarded", async () => {
    const encounters = createEncounterService({ createId: () => ID })
    await encounters.start()
    const result = await encounters.discard(ID)
    expect(result.status).toBe("discarded")
    expect((await encounters.get(ID)).status).toBe("discarded")
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

  it("relates a transcript id after the transcribed transition", async () => {
    const repository = createMemoryEncounterRepository()
    await repository.insert(transcribedRecord())
    const encounters = createEncounterService({ repository })
    const record = await encounters.get(ID)
    expect(record.transcriptId).toBe("22222222-2222-4222-8222-222222222222")
    await encounters.beginDrafting(ID)
    expect((await encounters.get(ID)).status).toBe("drafting")
    await encounters.markDrafted(ID)
    await encounters.markCompleted(ID)
    expect((await encounters.get(ID)).status).toBe("completed")
    expect((await encounters.get(ID)).completedAt).not.toBeNull()
  })
})
