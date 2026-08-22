import type { NotaLocalBridge } from "@notalocal/types"
import { createMockBridge } from "./mock"

export function getBridge(): NotaLocalBridge {
  return createMockBridge()
}
