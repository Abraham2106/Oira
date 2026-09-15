import { describe, expect, it } from "vitest"
import { parseVulkanProbeOutput } from "./probe-vulkan-index"

describe("parseVulkanProbeOutput", () => {
  it("reads the discrete Vulkan index from the last JSON line", () => {
    expect(parseVulkanProbeOutput("noise\n{\"ok\":true,\"vulkanIndex\":1}\n")).toBe(1)
  })

  it("ignores a failed probe", () => {
    expect(parseVulkanProbeOutput("{\"ok\":false,\"message\":\"timeout\"}\n")).toBeUndefined()
  })
})
