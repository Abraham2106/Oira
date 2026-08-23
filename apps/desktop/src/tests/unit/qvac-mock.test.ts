import { describe, expect, it } from "vitest"
import { createQvacClient } from "../../main/qvac/qvac.client"
import { createQvacRuntimeMock } from "../mocks/qvac.mock"

describe("qvac runtime mock", () => {
  it("loads a model id without importing the SDK", async () => {
    const client = createQvacClient({
      runtime: createQvacRuntimeMock(),
      modelSrc: { stt: "whisper-tiny" },
    })
    const modelId = await client.ensureModel("stt")
    expect(modelId).toContain("stt")
    expect(client.isReady("stt")).toBe(true)
  })
})
