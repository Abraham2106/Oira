export const INFERENCE_PHASES = [
  "transcribing",
  "structuring",
  "failed",
] as const

export type InferencePhase = (typeof INFERENCE_PHASES)[number]

export type InferenceProgress = {
  encounterId: string
  phase: InferencePhase
}
