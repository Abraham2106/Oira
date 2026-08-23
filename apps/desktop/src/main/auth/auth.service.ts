import { createAppError } from "../utils/app-error"
import { createIdleLock, IDLE_LOCK_MS } from "./lock"
import { hashPin, verifyPin } from "./pin.hash"
import type { PinHashStore } from "./pin-store"
import { createMemorySession } from "./session"

export type AuthStatus = {
  hasPin: boolean
  authenticated: boolean
}

export type SessionPort = {
  isAuthenticated: () => boolean
  touch: () => void
  status: () => Promise<AuthStatus>
  setPin: (pin: string) => Promise<{ set: true }>
  unlock: (pin: string) => Promise<{ unlocked: true }>
  lock: () => Promise<{ locked: true }>
  dispose: () => void
}

export type AuthServiceDeps = {
  pinStore: PinHashStore
  idleMs?: number
  sleep?: (ms: number) => Promise<void>
}

const MAX_BACKOFF_MS = 8_000

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function backoffMs(failedAttempts: number): number {
  if (failedAttempts <= 0) return 0
  return Math.min(MAX_BACKOFF_MS, 250 * 2 ** (failedAttempts - 1))
}

export function createAuthService(deps: AuthServiceDeps): SessionPort {
  const session = createMemorySession()
  const sleep = deps.sleep ?? defaultSleep
  let failedAttempts = 0
  const idle = createIdleLock({
    idleMs: deps.idleMs ?? IDLE_LOCK_MS,
    onIdle: () => {
      session.lock()
    },
  })

  const lockNow = () => {
    session.lock()
    idle.clear()
    return { locked: true as const }
  }

  return {
    isAuthenticated() {
      return session.isAuthenticated()
    },

    touch() {
      if (session.isAuthenticated()) idle.touch()
    },

    async status() {
      const hash = await deps.pinStore.getSerializedHash()
      return {
        hasPin: Boolean(hash),
        authenticated: session.isAuthenticated(),
      }
    },

    async setPin(pin) {
      const existing = await deps.pinStore.getSerializedHash()
      if (existing) {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "A PIN is already set.",
          { retryable: false },
        )
      }
      await deps.pinStore.setSerializedHash(hashPin(pin))
      session.unlock()
      idle.touch()
      failedAttempts = 0
      return { set: true }
    },

    async unlock(pin) {
      const wait = backoffMs(failedAttempts)
      if (wait > 0) await sleep(wait)

      const stored = await deps.pinStore.getSerializedHash()
      if (!stored) {
        throw createAppError(
          "NOT_AUTHENTICATED",
          "Set a PIN before unlocking.",
          { retryable: false },
        )
      }

      if (!verifyPin(pin, stored)) {
        failedAttempts += 1
        throw createAppError("NOT_AUTHENTICATED", "The PIN is incorrect.", {
          retryable: true,
        })
      }

      failedAttempts = 0
      session.unlock()
      idle.touch()
      return { unlocked: true }
    },

    async lock() {
      return lockNow()
    },

    dispose() {
      idle.clear()
    },
  }
}

export { IDLE_LOCK_MS }
