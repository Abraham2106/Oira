import { describe, expect, it } from "vitest"
import {
  CLINICAL_DRUGS,
  WHISPER_INITIAL_PROMPT,
  historyTermPattern,
  planTermPattern,
} from "./clinical-vocab"

describe("clinical vocab", () => {
  it("builds a diagnosis-free Whisper initial_prompt", () => {
    expect(WHISPER_INITIAL_PROMPT).toContain("ibuprofeno")
    expect(WHISPER_INITIAL_PROMPT).toContain("miligramos")
    expect(WHISPER_INITIAL_PROMPT).not.toMatch(/gastritis|faringitis|diagnóst/i)
    for (const drug of CLINICAL_DRUGS) {
      expect(WHISPER_INITIAL_PROMPT).toContain(drug)
    }
  })

  it("keeps plan variants that match corrupted STT without renaming them", () => {
    expect(planTermPattern()).toContain("profeno")
    expect(planTermPattern()).toContain("ibuprofeno")
  })

  it("lists gastritis as history, not as Whisper prompt", () => {
    expect(historyTermPattern()).toContain("gastritis")
    expect(WHISPER_INITIAL_PROMPT).not.toContain("gastritis")
  })
})
