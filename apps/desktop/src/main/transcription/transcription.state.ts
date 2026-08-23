import type { TranscriptionJobStatus } from "../../shared/constants/transcription-status"

export type { TranscriptionJobStatus }

export function canMoveTranscription(
  from: TranscriptionJobStatus,
  to: TranscriptionJobStatus,
): boolean {
  if (from === to) return true
  switch (from) {
    case "idle":
      return to === "loading-model" || to === "cancelled"
    case "loading-model":
      return (
        to === "transcribing" ||
        to === "failed" ||
        to === "cancelled"
      )
    case "transcribing":
      return (
        to === "done" ||
        to === "retrying" ||
        to === "failed" ||
        to === "cancelled"
      )
    case "retrying":
      return to === "transcribing" || to === "failed" || to === "cancelled"
    case "done":
    case "cancelled":
    case "failed":
      return false
  }
}
