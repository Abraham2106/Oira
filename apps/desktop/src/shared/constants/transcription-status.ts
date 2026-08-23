export const TRANSCRIPTION_JOB_STATUSES = [
  "idle",
  "loading-model",
  "transcribing",
  "retrying",
  "done",
  "cancelled",
  "failed",
] as const

export type TranscriptionJobStatus = (typeof TRANSCRIPTION_JOB_STATUSES)[number]
