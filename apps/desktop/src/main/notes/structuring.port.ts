import type { StructuringPort } from "../qvac/structuring.port"

export type { StructuringPort }

/** Empty facts: the mock must not invent clinical content. */
export function createMockStructuringPort(): StructuringPort {
  return {
    async complete() {
      return "{}"
    },
  }
}
