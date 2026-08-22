import { createMockBridge, type DemoBridge } from "./mock"

/**
 * Prototype UI still uses the in-renderer mock. `window.notalocal` is the
 * I04 IPC contract (`NotaLocalAPI`) and is not this DemoBridge.
 */
export function getBridge(): DemoBridge {
  return createMockBridge()
}
