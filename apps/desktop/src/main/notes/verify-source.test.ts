import { describe, expect, it } from "vitest"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import { verifySource } from "./verify-source"

describe("verifySource", () => {
  it("accepts the synthetic note against its transcript", () => {
    expect(verifySource(syntheticClinicalNote(), SYNTHETIC_TRANSCRIPT)).toBe(
      true,
    )
  })

  it("rejects a cited id that is not on the transcript", () => {
    const note = syntheticClinicalNote()
    note.sections.visit_context.sourceSegmentIds = ["missing"]
    expect(verifySource(note, SYNTHETIC_TRANSCRIPT)).toBe(false)
  })
})
