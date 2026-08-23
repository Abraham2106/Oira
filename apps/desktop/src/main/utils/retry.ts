export async function retry<T>(
  run: () => Promise<T>,
  options: {
    maxAttempts: number
    shouldRetry: (error: unknown) => boolean
  },
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      if (attempt === options.maxAttempts || !options.shouldRetry(error)) {
        throw error
      }
    }
  }
  throw lastError
}
