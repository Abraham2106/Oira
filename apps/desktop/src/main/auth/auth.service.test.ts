import { describe, expect, it } from "vitest"
import { createAuthService } from "./auth.service"
import { createMemoryPinStore } from "./pin-store"
import { hashPin, verifyPin } from "./pin.hash"
import { isAppError } from "../utils/app-error"

describe("pin.hash", () => {
  it("verifies a hash with timing-safe compare", () => {
    const stored = hashPin("1234")
    expect(verifyPin("1234", stored)).toBe(true)
    expect(verifyPin("1235", stored)).toBe(false)
    expect(stored.includes("1234")).toBe(false)
    expect(verifyPin("1234", "not-json")).toBe(false)
    expect(verifyPin("1234", JSON.stringify({ alg: "sha256", hash: "x" }))).toBe(
      false,
    )
  })
})

describe("createAuthService", () => {
  it("rejects unlock when no pin exists", async () => {
    const auth = createAuthService({
      pinStore: createMemoryPinStore(),
      sleep: async () => {},
    })
    await expect(auth.unlock("1234")).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" })
    expect(auth.isAuthenticated()).toBe(false)
  })

  it("sets a pin once and unlocks with it", async () => {
    const auth = createAuthService({
      pinStore: createMemoryPinStore(),
      sleep: async () => {},
    })
    await auth.setPin("2468")
    expect(auth.isAuthenticated()).toBe(true)
    await auth.lock()
    await auth.unlock("2468")
    expect(auth.isAuthenticated()).toBe(true)
    await expect(auth.setPin("9999")).rejects.toSatisfy((error: unknown) =>
      isAppError(error) && error.code === "INVALID_STATE_TRANSITION",
    )
  })

  it("lock does not remove the stored pin hash", async () => {
    const auth = createAuthService({
      pinStore: createMemoryPinStore(),
      sleep: async () => {},
    })
    await auth.setPin("1357")
    await auth.lock()
    expect(auth.isAuthenticated()).toBe(false)
    expect((await auth.status()).hasPin).toBe(true)
  })
})
