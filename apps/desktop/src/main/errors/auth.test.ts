import { describe, expect, it } from "vitest"
import { authNotImplementedError } from "./auth"
import { createAuthStub } from "../auth/auth.service"

describe("errors/auth", () => {
  it("refuses to pretend unlock exists", () => {
    const error = authNotImplementedError()
    expect(error.code).toBe("NOT_IMPLEMENTED")
    expect(error.retryable).toBe(false)
  })

  it("auth stub never authenticates and rejects unlock", async () => {
    const session = createAuthStub()
    expect(session.isAuthenticated()).toBe(false)
    await expect(session.unlock("0000")).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      name: "NotaLocalAppError",
    })
    expect(session.isAuthenticated()).toBe(false)
  })
})
