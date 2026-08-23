import { describe, expect, it } from "vitest"
import { z } from "zod"
import { withValidation } from "./withValidation"
import type { SessionPort } from "../auth"

const unlocked: SessionPort = {
  isAuthenticated: () => true,
  touch: () => {},
  status: async () => ({ hasPin: true, authenticated: true }),
  setPin: async () => ({ set: true }),
  unlock: async () => ({ unlocked: true }),
  lock: async () => ({ locked: true }),
  dispose: () => {},
}

describe("withValidation", () => {
  it("rejects invalid input without calling run", async () => {
    let ran = false
    const handler = withValidation({
      channel: "test:in",
      schema: z.object({ encounterId: z.string().uuid() }).strict(),
      outputSchema: z.object({ ok: z.literal(true) }).strict(),
      session: unlocked,
      logger: { call() {} },
      run: async () => {
        ran = true
        return { ok: true as const }
      },
    })
    const result = await handler({ encounterId: "not-a-uuid" })
    expect(ran).toBe(false)
    expect(result).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } })
  })

  it("rejects output that does not match the schema and does not leak extra fields", async () => {
    const handler = withValidation({
      channel: "test:out",
      schema: z.object({}).strict(),
      outputSchema: z.object({ encounterId: z.string().uuid() }).strict(),
      session: unlocked,
      logger: { call() {} },
      run: async () => ({
        encounterId: "11111111-1111-4111-8111-111111111111",
        transcript: "clinical text must not leak",
      }),
    })
    const result = await handler({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT")
    }
    expect(JSON.stringify(result)).not.toContain("clinical text")
  })

  it("returns parsed output on success", async () => {
    const handler = withValidation({
      channel: "test:ok",
      schema: z.object({}).strict(),
      outputSchema: z.object({ encounterId: z.string().uuid() }).strict(),
      session: unlocked,
      logger: { call() {} },
      run: async () => ({
        encounterId: "11111111-1111-4111-8111-111111111111",
      }),
    })
    const result = await handler({})
    expect(result).toEqual({
      ok: true,
      data: { encounterId: "11111111-1111-4111-8111-111111111111" },
    })
  })
})
