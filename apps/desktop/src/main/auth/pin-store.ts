export type PinHashStore = {
  getSerializedHash: () => Promise<string | undefined>
  setSerializedHash: (value: string) => Promise<void>
}

export function createMemoryPinStore(initial?: string): PinHashStore {
  let hash = initial
  return {
    async getSerializedHash() {
      return hash
    },
    async setSerializedHash(value) {
      hash = value
    },
  }
}
