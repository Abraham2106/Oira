export type SessionPort = {
  isAuthenticated: () => boolean
  unlock: (pin: string) => Promise<{ unlocked: true }>
  lock: () => Promise<{ locked: true }>
}

export function createAuthStub(): SessionPort {
  let authenticated = false
  return {
    isAuthenticated() {
      return authenticated
    },
    async unlock() {
      authenticated = true
      return { unlocked: true }
    },
    async lock() {
      authenticated = false
      return { locked: true }
    },
  }
}
