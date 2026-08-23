export type Clock = {
  nowIso: () => string
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}
