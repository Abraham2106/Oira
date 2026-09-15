import { describe, expect, it } from "vitest"
import { liveHeadline, reduceModelDebugState } from "./ModelDebugPanel"

const initial = {
  whisper: "IDLE" as const,
  qwen: "IDLE" as const,
}

describe("reduceModelDebugState", () => {
  it("tracks Whisper loading states and device evidence", () => {
    expect(
      reduceModelDebugState(initial, {
        model: "whisper",
        state: "TRANSCRIBING",
        device: { requested: "RTX 2050", acceleration: "use_gpu=true; gpu_device=1" },
      }),
    ).toMatchObject({ whisper: "TRANSCRIBING", whisperDevice: { requested: "RTX 2050" } })
  })

  it("tracks Qwen state and preserves missing effective evidence", () => {
    expect(
      reduceModelDebugState(initial, {
        model: "qwen",
        state: "STRUCTURING",
        device: { requested: "RTX 2050", acceleration: "gpu_layers=99" },
      }),
    ).toMatchObject({ qwen: "STRUCTURING", qwenDevice: { requested: "RTX 2050" } })
  })

  it("prefers the busy model in the compact toast", () => {
    expect(liveHeadline("LOADING", "UNLOADED")).toEqual({ label: "Cargando", tone: "loading" })
    expect(liveHeadline("READY", "STRUCTURING")).toEqual({ label: "Estructurando", tone: "loading" })
    expect(liveHeadline("READY", "UNLOADED")).toEqual({ label: "Cargado", tone: "ready" })
  })
})
