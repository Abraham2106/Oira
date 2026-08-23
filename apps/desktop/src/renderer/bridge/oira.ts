import { adaptOiraApi } from "./ipc"
import { createMockBridge, type DemoBridge } from "./mock"

export function getBridge(): DemoBridge {
  if (typeof window !== "undefined" && window.oira) {
    return adaptOiraApi(window.oira)
  }
  return createMockBridge()
}
