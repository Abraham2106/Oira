import type { LlmModelConfig } from "@qvac/sdk"

export const QWEN_CTX_SIZE = 4096
export const QWEN_GPU_LAYERS = 99

export type QwenDeviceOptions = {
  mainGpu?: number | "integrated" | "dedicated"
}

export function qwenAccelerationLabel(mainGpu: number | "integrated" | "dedicated" = "dedicated"): string {
  return `gpu_layers=${QWEN_GPU_LAYERS}; device=gpu; main-gpu=${mainGpu}`
}

/**
 * llama.cpp completion config for Qwen. `gpu_layers: 99` requests full GPU
 * residency. `main-gpu` is the addon's hybrid selector: `"dedicated"` prefers
 * the discrete GPU; omitting it lets Vulkan take GPU 0 (often the iGPU).
 */
export function createQwenLlmConfig(device: QwenDeviceOptions = {}): LlmModelConfig {
  const mainGpu = device.mainGpu ?? "dedicated"
  return {
    ctx_size: QWEN_CTX_SIZE,
    gpu_layers: QWEN_GPU_LAYERS,
    device: "gpu",
    temp: 0,
    top_p: 1,
    seed: 0,
    reasoning_budget: 0,
    predict: 2048,
    "split-mode": "none",
    "main-gpu": mainGpu,
  }
}

export function createQwenGenerationParams() {
  return {
    temp: 0,
    top_p: 1,
    seed: 0,
    reasoning_budget: 0,
    predict: 2048,
  }
}
