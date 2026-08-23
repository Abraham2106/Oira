import { describe, expect, it } from "vitest"
import { DEFAULT_IDLE_LOCK_MS } from "../../shared/constants/auth"
import { startEncounterInputSchema } from "../../shared/schemas/ipc.schema"
import { structuredClinicalFactsSchema } from "../../shared/schemas/clinical.schema"
import { rendererEventSchema } from "../../shared/schemas/event.schema"
import { parseSettings } from "../../shared/schemas/settings.schema"

describe("shared schemas", () => {
  it("rejects extra IPC fields", () => {
    const parsed = startEncounterInputSchema.safeParse({ extra: true })
    expect(parsed.success).toBe(false)
  })

  it("accepts omitted clinical facts", () => {
    expect(structuredClinicalFactsSchema.parse({})).toEqual({})
  })

  it("fills idleLockMs and rejects unknown settings keys", () => {
    const parsed = parseSettings({
      audioRetention: "until-note-approved",
      transcriptRetention: { unit: "days", value: 30 },
      noteRetention: "forever",
      sttModelId: null,
      uiLocale: "es",
    })
    expect(parsed.idleLockMs).toBe(DEFAULT_IDLE_LOCK_MS)
    expect(() =>
      parseSettings({
        audioRetention: "until-note-approved",
        transcriptRetention: { unit: "days", value: 30 },
        noteRetention: "forever",
        sttModelId: null,
        uiLocale: "es",
        extra: true,
      }),
    ).toThrow()
  })

  it("rejects clinical text on renderer events", () => {
    const parsed = rendererEventSchema.safeParse({
      type: "transcription.progress",
      encounterId: "11111111-1111-4111-8111-111111111111",
      status: "transcribing",
      transcript: "PHI must not appear on the event bus",
    })
    expect(parsed.success).toBe(false)
  })
})
