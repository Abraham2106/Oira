import { describe, expect, it } from "vitest"
import { ENCOUNTER_STATUSES, type EncounterStatus } from "../../shared/constants/encounter-status"
import { isAppError } from "../utils/app-error"
import { assertTransition, canTransition } from "./encounter.state"

const ALLOWED: Array<[EncounterStatus, EncounterStatus]> = [
  ["created", "recording"],
  ["created", "failed"],
  ["created", "discarded"],
  ["recording", "transcribing"],
  ["recording", "failed"],
  ["recording", "discarded"],
  ["transcribing", "transcribed"],
  ["transcribing", "failed"],
  ["transcribing", "discarded"],
  ["transcribed", "drafting"],
  ["transcribed", "failed"],
  ["transcribed", "discarded"],
  ["drafting", "drafted"],
  ["drafting", "failed"],
  ["drafting", "discarded"],
  ["drafted", "completed"],
  ["drafted", "discarded"],
  ["failed", "discarded"],
]

describe("canTransition", () => {
  it.each(ALLOWED)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  it("rejects every other pair, including completed → discarded", () => {
    const allowed = new Set(ALLOWED.map(([from, to]) => `${from}->${to}`))
    for (const from of ENCOUNTER_STATUSES) {
      for (const to of ENCOUNTER_STATUSES) {
        if (allowed.has(`${from}->${to}`)) continue
        expect(canTransition(from, to)).toBe(false)
      }
    }
  })

  it("throws INVALID_STATE_TRANSITION instead of mutating silently", () => {
    expect(() => assertTransition("created", "completed")).toThrow()
    try {
      assertTransition("drafted", "recording")
    } catch (error) {
      expect(isAppError(error) && error.code === "INVALID_STATE_TRANSITION").toBe(true)
    }
  })
})
