import { describe, expect, it } from "vitest"
import {
  HEAVY_MODEL_IDS,
  OPTIONAL_LLM_MODEL_ID,
  P0_LLM_MODEL_ID,
  P0_SMOKE_MODEL_ID,
  P0_STT_MODEL_ID,
  resolveLlmModelId,
} from "./model-ids"

describe("P0 QVAC model ids", () => {
  it("uses Whisper small for Spanish STT and Qwen 1.7B instruct", () => {
    expect(P0_STT_MODEL_ID).toBe("WHISPER_SMALL_Q8_0")
    expect(P0_LLM_MODEL_ID).toBe("QWEN3_1_7B_INST_Q4")
    expect(P0_SMOKE_MODEL_ID).toBe("WHISPER_SMALL_Q8_0")
  })

  it("does not select 4B, Whisper large, or Parakeet", () => {
    const chosen = [P0_STT_MODEL_ID, P0_LLM_MODEL_ID, P0_SMOKE_MODEL_ID]
    for (const id of chosen) {
      expect(HEAVY_MODEL_IDS).not.toContain(id)
    }
  })

  it("defaults to 1.7B and opts into 4B instruct via NOTALOCAL_LLM", () => {
    expect(resolveLlmModelId(undefined)).toBe(P0_LLM_MODEL_ID)
    expect(resolveLlmModelId("")).toBe(P0_LLM_MODEL_ID)
    expect(resolveLlmModelId(P0_LLM_MODEL_ID)).toBe(P0_LLM_MODEL_ID)
    expect(resolveLlmModelId(OPTIONAL_LLM_MODEL_ID)).toBe(OPTIONAL_LLM_MODEL_ID)
    expect(() => resolveLlmModelId("QWEN3_4B_Q4_K_M")).toThrow("UNKNOWN_LLM")
  })
})
