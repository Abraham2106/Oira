import { describe, expect, it } from "vitest"
import { rejectOnTimeout } from "./watchdog"

describe("rejectOnTimeout", () => {
  it("rejects with the factory error after AbortSignal.timeout", async () => {
    await expect(rejectOnTimeout(20, () => new Error("LOAD_WATCHDOG"))).rejects.toThrow(
      "LOAD_WATCHDOG",
    )
  })
})
