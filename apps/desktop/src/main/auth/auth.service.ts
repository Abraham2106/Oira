import { authNotImplementedError } from "../errors/auth"

export type SessionPort = {
  isAuthenticated: () => boolean
  unlock: (pin: string) => Promise<{ unlocked: true }>
  lock: () => Promise<{ locked: true }>
}

/**
 * Honest stub for the backend deliverable (auth PIN is out of I01–I12).
 * Never sets authenticated=true; unlock always fails with NOT_IMPLEMENTED.
 */
export function createAuthStub(): SessionPort {
  return {
    isAuthenticated() {
      return false
    },
    async unlock(_pin: string) {
      throw authNotImplementedError()
    },
    async lock() {
      return { locked: true }
    },
  }
}
