import type { NotaLocalBridge } from "@notalocal/types"
import { createMockBridge } from "./mock"

/**
 * Prototype screens still use Antonio's local mock.
 * New system calls must go through `window.notalocal` (preload).
 */
export function getBridge(): NotaLocalBridge {
  return createMockBridge()
}

export function getMainApi(): Window["notalocal"] | undefined {
  if (typeof window === "undefined") return undefined
  return window.notalocal
}
