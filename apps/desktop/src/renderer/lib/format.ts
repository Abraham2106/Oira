export function formatElapsed(startedAtMs: number, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}
