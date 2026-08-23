/** Race a promise against AbortSignal.timeout — same pattern as smoke.ts. */
export function rejectOnTimeout(ms: number, createError: () => Error): Promise<never> {
  return new Promise((_, reject) => {
    const signal = AbortSignal.timeout(ms)
    const fail = () => reject(createError())
    if (signal.aborted) {
      fail()
      return
    }
    signal.addEventListener("abort", fail, { once: true })
  })
}
