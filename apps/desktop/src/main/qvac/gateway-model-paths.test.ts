import { describe, expect, it } from "vitest"
import { parseGatewayModelArg, resolveGatewayModelPaths, stringEnv } from "./gateway-model-paths"

describe("gateway model path delivery", () => {
  it("drops undefined env values so Chromium can fork the utility process", () => {
    expect(stringEnv({ PATH: "C:\\Windows", EMPTY: undefined, OIRA_WHISPER_MODEL_PATH: "C:/w.bin" })).toEqual({
      PATH: "C:\\Windows",
      OIRA_WHISPER_MODEL_PATH: "C:/w.bin",
    })
  })

  it("reads model paths from argv when env is stripped", () => {
    expect(parseGatewayModelArg(["gateway.js", "{\"whisper\":\"C:/cache/ggml.bin\"}"])).toEqual({
      whisper: "C:/cache/ggml.bin",
    })
    expect(resolveGatewayModelPaths({}, ["{\"whisper\":\"C:/cache/ggml.bin\",\"qwen\":\"C:/cache/qwen.gguf\"}"])).toEqual({
      whisper: "C:/cache/ggml.bin",
      qwen: "C:/cache/qwen.gguf",
    })
  })

  it("prefers env over argv", () => {
    expect(resolveGatewayModelPaths(
      { OIRA_WHISPER_MODEL_PATH: "C:/env.bin" },
      ["{\"whisper\":\"C:/argv.bin\"}"],
    )).toEqual({ whisper: "C:/env.bin" })
  })
})
