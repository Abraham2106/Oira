import { describe, expect, it } from "vitest"
import { extractGpusFromSystemResources, selectPreferredGpu } from "./device-selection"
import { createQwenLlmConfig } from "./qwen-llm-config"

const mib = (value: number) => value * 1024 * 1024

describe("selectPreferredGpu", () => {
  it("picks the GPU with the most VRAM and maps llama.cpp past smaller adapters", () => {
    const selected = selectPreferredGpu([
      { id: "amd-0", name: "AMD Radeon Graphics", vendor: "AMD", index: 0, vramBytes: mib(512) },
      { id: "nvidia-1", name: "NVIDIA RTX 2050", vendor: "NVIDIA", index: 1, vramBytes: mib(4096) },
    ])
    expect(selected?.identity.id).toBe("nvidia-1")
    expect(selected?.llmMainGpu).toBe(1)
    expect(selected?.whisperGpuDevice).toBe(1)
    expect(selected?.requestedLabel).toContain("4.0 GiB")
  })

  it("still uses Vulkan 1 when the high-VRAM GPU is listed first", () => {
    const selected = selectPreferredGpu([
      { id: "nvidia-0", name: "NVIDIA RTX 2050", vendor: "NVIDIA", index: 0, vramBytes: mib(4096) },
      { id: "amd-1", name: "AMD Radeon Graphics", vendor: "AMD", index: 1, vramBytes: mib(512) },
    ])
    expect(selected?.identity.id).toBe("nvidia-0")
    expect(selected?.llmMainGpu).toBe(1)
  })

  it("uses device 0 when a single GPU is present", () => {
    const selected = selectPreferredGpu([
      { id: "gpu-0", name: "Apple M4", vendor: "Apple", index: 0, vramBytes: mib(16384) },
    ])
    expect(selected?.identity.id).toBe("gpu-0")
    expect(selected?.llmMainGpu).toBe(0)
  })

  it("falls back to a non-integrated adapter when VRAM is missing", () => {
    const selected = selectPreferredGpu([
      { id: "amd-0", name: "AMD Radeon Graphics", vendor: "AMD", index: 0 },
      { id: "nvidia-1", name: "NVIDIA RTX 2050", vendor: "NVIDIA", index: 1 },
    ])
    expect(selected?.identity.id).toBe("nvidia-1")
    expect(selected?.llmMainGpu).toBe(1)
    expect(selected?.fallbackReason).toContain("no integrada")
  })

  it("does not classify a dedicated Intel Arc GPU as integrated", () => {
    const selected = selectPreferredGpu([
      { id: "intel-igpu", name: "Intel Iris Xe Graphics", vendor: "Intel", index: 0 },
      { id: "intel-arc", name: "Intel Arc A370M", vendor: "Intel", index: 1 },
    ])
    expect(selected?.identity.id).toBe("intel-arc")
    expect(selected?.llmMainGpu).toBe(1)
    expect(selected?.fallbackReason).toContain("no integrada")
  })

  it("keeps ties deterministic and maps the highest tier after lower-VRAM adapters", () => {
    const selected = selectPreferredGpu([
      { id: "integrated", name: "AMD Radeon Graphics", vendor: "AMD", index: 0, vramBytes: mib(512) },
      { id: "first-tie", name: "NVIDIA RTX A", vendor: "NVIDIA", index: 1, vramBytes: mib(4096) },
      { id: "second-tie", name: "NVIDIA RTX B", vendor: "NVIDIA", index: 2, vramBytes: mib(4096) },
    ])
    expect(selected?.identity.id).toBe("first-tie")
    expect(selected?.llmMainGpu).toBe(1)
  })

  it("reports the safe backend fallback when only an unknown integrated GPU exists", () => {
    const selected = selectPreferredGpu([
      { id: "intel-igpu", name: "Intel UHD Graphics", vendor: "Intel", index: 0 },
    ])
    expect(selected?.llmMainGpu).toBe(0)
    expect(selected?.fallbackReason).toContain("backend")
  })

  it("returns undefined when no GPU is reported", () => {
    expect(selectPreferredGpu([])).toBeUndefined()
  })
})

describe("extractGpusFromSystemResources", () => {
  it("merges sample VRAM onto capability rows", () => {
    const gpus = extractGpusFromSystemResources({
      capabilities: {
        gpus: {
          status: "supported",
          value: [
            { id: "amd-0", name: { status: "supported", value: "AMD Radeon Graphics" }, vendor: { status: "supported", value: "AMD" } },
            { id: "nvidia-1", name: { status: "supported", value: "RTX 2050" }, vendor: { status: "supported", value: "NVIDIA" } },
          ],
        },
      },
      sample: {
        gpus: {
          status: "supported",
          value: [
            { id: "amd-0", memory: { total: { status: "supported", value: mib(512) } } },
            { id: "nvidia-1", memory: { total: { status: "supported", value: mib(4096) } } },
          ],
        },
      },
    })
    expect(gpus[1]?.vramBytes).toBe(mib(4096))
    expect(selectPreferredGpu(gpus)?.identity.id).toBe("nvidia-1")
  })
})

describe("createQwenLlmConfig", () => {
  it("forwards the selected llama.cpp device index", () => {
    expect(createQwenLlmConfig()["main-gpu"]).toBeUndefined()
    expect(createQwenLlmConfig({ mainGpu: 1 })["main-gpu"]).toBe(1)
    expect(createQwenLlmConfig({ mainGpu: 0 })["main-gpu"]).toBe(0)
  })
})
