export type TranscriptionJobStatus =
  | "idle"
  | "loading-model"
  | "transcribing"
  | "retrying"
  | "done"
  | "cancelled"
  | "failed"

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
