import { describe, expect, it } from "vitest"
import { primaryActionKey, progressPercent, type SetupModel } from "./ModelSetup"

describe("ModelSetup presentation helpers", () => {
  it("uses real totals for progress and clamps invalid values", () => {
    const model = (downloadedBytes?: number, totalBytes?: number): SetupModel => ({
      id: "whisper",
      status: "downloading",
      downloadedBytes,
      totalBytes,
    })

    expect(progressPercent(model(50, 100))).toBe(50)
    expect(progressPercent(model(120, 100))).toBe(100)
    expect(progressPercent(model(20))).toBeNull()
  })

  it("keeps blocked, retry and completion actions explicit", () => {
    expect(primaryActionKey("blocked")).toBe("modelSetup.action.checkAgain")
    expect(primaryActionKey("error")).toBe("modelSetup.action.retry")
    expect(primaryActionKey("ready")).toBe("modelSetup.action.continue")
  })
})
