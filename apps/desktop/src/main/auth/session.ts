export type MemorySession = {
  isAuthenticated: () => boolean
  unlock: () => void
  lock: () => void
}

export function createMemorySession(): MemorySession {
  let authenticated = false
  return {
    isAuthenticated() {
      return authenticated
    },
    unlock() {
      authenticated = true
    },
    lock() {
      authenticated = false
    },
  }
}
