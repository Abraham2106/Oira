import { describe, expect, it } from "vitest"
import { pinGgmlVulkanDevice } from "./pin-ggml-vulkan"

describe("pinGgmlVulkanDevice", () => {
  it("exposes the physical Vulkan index as device 0 on Windows", () => {
    const env: NodeJS.ProcessEnv = {}
    expect(pinGgmlVulkanDevice(1, env, "win32")).toBe(0)
    expect(env.GGML_VK_VISIBLE_DEVICES).toBe("1")
  })

  it("does not retarget an already pinned process", () => {
    const env: NodeJS.ProcessEnv = { GGML_VK_VISIBLE_DEVICES: "1" }
    expect(pinGgmlVulkanDevice(1, env, "win32")).toBe(0)
    expect(env.GGML_VK_VISIBLE_DEVICES).toBe("1")
  })

  it("leaves Metal to the original index", () => {
    const env: NodeJS.ProcessEnv = {}
    expect(pinGgmlVulkanDevice(1, env, "darwin")).toBe(1)
    expect(env.GGML_VK_VISIBLE_DEVICES).toBeUndefined()
  })
})
