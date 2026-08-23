import { describe, expect, it } from "vitest"
import { buildExtractionPrompt } from "./prompts"

describe("Qwen extraction prompt", () => {
  it("wraps segments as data, not instructions", () => {
    const prompt = buildExtractionPrompt([
      { id: "seg-1", speaker: null, startMs: 0, text: "Me duele la rodilla." },
    ])
    expect(prompt).toContain("<<<TRANSCRIPCION_INICIO>>>")
    expect(prompt).toContain("[seg-1] Me duele la rodilla.")
    expect(prompt).toContain("visit_context")
  })
})
