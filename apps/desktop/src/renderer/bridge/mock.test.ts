import { describe, expect, it } from "vitest"
import { SECTION_IDS } from "@notalocal/types"
import { createMockBridge, SYNTHETIC_TRANSCRIPT } from "./mock"

describe("mock bridge", () => {
  it("start → stop → generateNote entrega 7 secciones sintéticas", async () => {
    const bridge = createMockBridge()
    const started = await bridge.startEncounter({ label: "", visitType: "" })
    await bridge.stopEncounter(started.encounterId)
    const generated = await bridge.generateNote(started.encounterId)

    expect(Object.keys(generated.note.sections).sort()).toEqual([...SECTION_IDS].sort())
    expect(generated.transcript).toHaveLength(SYNTHETIC_TRANSCRIPT.length)
    const blob = JSON.stringify(generated)
    expect(blob).not.toMatch(/\b\d{7,}\b/)
    expect(blob.toLowerCase()).not.toContain("dni")
  })
})
