import type { TranscriptSegment } from "@oira/types"

export const INFERENCE_PHASES = [
  "transcribing",
  "structuring",
  "reviewing",
  "failed",
] as const

export type InferencePhase = (typeof INFERENCE_PHASES)[number]

export type InferenceFailureStage = "transcription" | "structuring" | "review"

export type InferenceProgress = {
  encounterId: string
  phase: InferencePhase
  /** Present once Whisper has delivered a transcript, including on later structure failures. */
  transcript?: TranscriptSegment[]
  stage?: InferenceFailureStage
}
