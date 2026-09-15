/**
 * GGML Vulkan treats this like CUDA_VISIBLE_DEVICES: the listed physical
 * index becomes device 0 for llama.cpp / whisper.cpp. Must be set before
 * Vulkan init (SDK import). If the process already inherited the pin, keep it.
 */
export function pinGgmlVulkanDevice(
  physicalIndex: number,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): number {
  if (!Number.isInteger(physicalIndex) || physicalIndex < 0) return physicalIndex
  if (platform === "darwin") return physicalIndex
  if (env.GGML_VK_VISIBLE_DEVICES) return 0
  env.GGML_VK_VISIBLE_DEVICES = String(physicalIndex)
  return 0
}
