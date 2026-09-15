import { describe, expect, it } from "vitest"
import { extractGpusFromSystemResources, selectPreferredGpu } from "./device-selection"

describe("selectPreferredGpu", () => {
  it("picks the discrete adapter without using CUDA as a discriminator", () => {
    const selected = selectPreferredGpu([
      { id: "amd-0", name: "AMD Radeon Graphics", vendor: "AMD", index: 0, cuda: false, vramBytes: 512 },
      { id: "nvidia-1", name: "NVIDIA RTX 2050", vendor: "NVIDIA", index: 1, cuda: false, vramBytes: 4096 },
    ])
    expect(selected?.identity.id).toBe("nvidia-1")
    expect(selected?.whisperGpuDevice).toBe(1)
    expect(selected?.llmMainGpu).toBe("dedicated")
  })

  it("ranks available adapters without a CUDA discriminator", () => {
    const selected = selectPreferredGpu([
      { id: "amd", name: "AMD integrated", index: 0, cuda: false, vramBytes: 512 },
      { id: "arc", name: "Intel Arc", index: 1, cuda: false, vramBytes: 4096 },
    ])
    expect(selected?.identity.id).toBe("arc")
    expect(selected?.llmMainGpu).toBe("dedicated")
  })

  it("asks llama.cpp for the integrated class when that is the only adapter", () => {
    const selected = selectPreferredGpu([
      { id: "amd-0", name: "AMD Radeon Graphics", vendor: "AMD", index: 0 },
    ])
    expect(selected?.whisperGpuDevice).toBe(0)
    expect(selected?.llmMainGpu).toBe("integrated")
  })

  it("returns no diagnostic selection when no adapter is reported", () => {
    expect(selectPreferredGpu([])).toBeUndefined()
  })
})

describe("extractGpusFromSystemResources", () => {
  it("preserves driver metadata for diagnostics", () => {
    const gpus = extractGpusFromSystemResources({
      capabilities: { gpus: { status: "supported", value: [
        { id: "gpu-0", name: "GPU", drivers: { cuda: { status: "supported", value: false } } },
      ] } },
    })
    expect(gpus[0]?.cuda).toBe(false)
  })
})
