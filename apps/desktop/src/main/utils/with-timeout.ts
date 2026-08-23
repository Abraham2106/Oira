export async function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  onTimeout?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error("Operation timed out."))
    }, ms)
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
