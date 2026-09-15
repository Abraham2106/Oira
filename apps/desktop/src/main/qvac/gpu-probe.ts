/**
 * Short-lived process: list GPUs via bare-gpu-info, then exit.
 * Must not share an address space with the gateway — Vulkan init in that
 * process would pin the iGPU before GGML_VK_VISIBLE_DEVICES can hide it.
 */
if (process.versions.electron) process.env.ELECTRON_RUN_AS_NODE = "1"

export {}

const sdk = await import("./sdk")
const { extractGpusFromSystemResources, selectPreferredGpu } = await import("./device-selection")

try {
  const resources = await sdk.getSystemResources({ sample: false })
  const chosen = selectPreferredGpu(extractGpusFromSystemResources(resources))
  const vulkanIndex = chosen?.llmMainGpu === "dedicated" ? chosen.whisperGpuDevice : undefined
  process.stdout.write(`${JSON.stringify({ ok: true, vulkanIndex })}\n`)
} catch (error) {
  process.stdout.write(`${JSON.stringify({ ok: false, message: error instanceof Error ? error.message : "probe failed" })}\n`)
} finally {
  await sdk.close().catch(() => undefined)
  process.exit(0)
}
