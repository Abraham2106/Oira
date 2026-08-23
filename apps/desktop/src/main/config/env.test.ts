import { describe, expect, it } from "vitest"
import { resolveAppEnv } from "./env"

describe("resolveAppEnv inference adapter", () => {
  it("defaults to qvac outside tests", () => {
    expect(
      resolveAppEnv({ isPackaged: false, nodeEnv: "development" })
        .inferenceAdapter,
    ).toBe("qvac")
  })

  it("accepts mock outside tests", () => {
    expect(
      resolveAppEnv({
        isPackaged: false,
        nodeEnv: "development",
        inferenceAdapter: "mock",
      }).inferenceAdapter,
    ).toBe("mock")
  })

  it("forces mock in test even if qvac is requested", () => {
    expect(
      resolveAppEnv({
        isPackaged: false,
        nodeEnv: "test",
        inferenceAdapter: "qvac",
      }).inferenceAdapter,
    ).toBe("mock")
  })
})
