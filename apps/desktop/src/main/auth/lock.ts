import { DEFAULT_IDLE_LOCK_MS } from "../../shared/constants/auth"

export const IDLE_LOCK_MS = DEFAULT_IDLE_LOCK_MS

export type IdleLock = {
  touch: () => void
  clear: () => void
}

export function createIdleLock(options: {
  onIdle: () => void
  idleMs?: number
  setTimer?: typeof setTimeout
  clearTimer?: typeof clearTimeout
}): IdleLock {
  const idleMs = options.idleMs ?? IDLE_LOCK_MS
  const setTimer = options.setTimer ?? setTimeout
  const clearTimer = options.clearTimer ?? clearTimeout
  let timer: ReturnType<typeof setTimeout> | undefined

  const clear = () => {
    if (timer !== undefined) {
      clearTimer(timer)
      timer = undefined
    }
  }

  return {
    touch() {
      clear()
      timer = setTimer(() => {
        timer = undefined
        options.onIdle()
      }, idleMs)
    },
    clear,
  }
}
