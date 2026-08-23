import { describe, expect, it } from "vitest"
import {
  encounterAlreadyActiveError,
  encounterNotFoundError,
  invalidEncounterTransitionError,
} from "./encounters"
import { createEncounterService } from "../encounters/encounter.service"
import { assertTransition } from "../encounters/encounter.state"

describe("errors/encounters", () => {
  it("uses INVALID_STATE_TRANSITION for lifecycle violations", () => {
    expect(encounterNotFoundError().code).toBe("INVALID_STATE_TRANSITION")
    expect(encounterAlreadyActiveError().code).toBe("INVALID_STATE_TRANSITION")
    expect(invalidEncounterTransitionError().code).toBe(
      "INVALID_STATE_TRANSITION",
    )
  })

  it("encounter service throws branded lifecycle errors", async () => {
    const encounters = createEncounterService({
      createId: () => "00000000-0000-4000-8000-000000000001",
      clock: { nowIso: () => "2026-08-22T00:00:00.000Z" },
    })
    await encounters.start()
    await expect(encounters.start()).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
      name: "OiraAppError",
    })
    expect(() => assertTransition("completed", "recording")).toThrowError(
      expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }),
    )
  })
})
