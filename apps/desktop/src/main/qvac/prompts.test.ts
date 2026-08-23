import { describe, expect, it } from "vitest"
import { buildExtractionPrompt, QWEN_SYSTEM_PROMPT } from "./prompts"

describe("Qwen extraction prompt", () => {
  it("wraps segments as data, not instructions", () => {
    const prompt = buildExtractionPrompt([
      { id: "seg-1", speaker: null, startMs: 0, text: "Me duele la rodilla." },
    ])
    expect(prompt).toContain("<<<TRANSCRIPCION_INICIO>>>")
    expect(prompt).toContain("<<<TRANSCRIPCION_FIN>>>")
    expect(prompt).toContain("[seg-1] Me duele la rodilla.")
    expect(prompt).toContain("Deja vacías")
  })

  it("tells the model to split motivo vs relato", () => {
    const combined = `${QWEN_SYSTEM_PROMPT}\n${buildExtractionPrompt([
      { id: "seg-1", speaker: null, startMs: 0, text: "Me duele la rodilla." },
    ])}`
    expect(combined).toMatch(/Separa motivo.*relato|parte por propósito/s)
    expect(QWEN_SYSTEM_PROMPT).toContain("visit_context = motivo/contexto")
    expect(QWEN_SYSTEM_PROMPT).toContain(
      "clinical_narrative = síntomas, evolución y negaciones",
    )
  })
})
