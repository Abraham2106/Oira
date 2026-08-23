import { describe, expect, it } from "vitest"
import { startEncounterInputSchema } from "../../shared/schemas/ipc.schema"
import { structuredClinicalFactsSchema } from "../../shared/schemas/clinical.schema"

describe("shared schemas", () => {
  it("rejects extra IPC fields", () => {
    const parsed = startEncounterInputSchema.safeParse({ extra: true })
    expect(parsed.success).toBe(false)
  })

  it("accepts omitted clinical facts", () => {
    expect(structuredClinicalFactsSchema.parse({})).toEqual({})
  })
})
