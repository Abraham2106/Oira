export type StructuringPort = {
  complete: (input: { prompt: string; transcriptText: string }) => Promise<string>
}

/** Empty facts: the mock must not invent clinical content. */
export function createMockStructuringPort(): StructuringPort {
  return {
    async complete() {
      return "{}"
    },
  }
}
