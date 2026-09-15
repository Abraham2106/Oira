import { describe, expect, it } from "vitest"
import { aiEngineStateFromModels } from "./modelEngineState"

describe("aiEngineStateFromModels", () => {
  it("shows loading while Whisper is warming", () => {
    expect(aiEngineStateFromModels("LOADING", "IDLE")).toBe("MODEL_LOADING")
  })

  it("shows loading while Qwen is structuring", () => {
    expect(aiEngineStateFromModels("UNLOADED", "STRUCTURING")).toBe("MODEL_LOADING")
  })

  it("keeps ready when both models are idle", () => {
    expect(aiEngineStateFromModels("IDLE", "IDLE")).toBe("LOCAL_INFERENCE_READY")
  })

  it("surfaces a failed load", () => {
    expect(aiEngineStateFromModels("FAILED", "IDLE")).toBe("MODEL_NOT_READY")
  })
})
