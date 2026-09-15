import type { AppErrorCode } from "../constants/app-error-codes"

export type SerializableError = {
  code: AppErrorCode
  message: string
  hint?: string
  retryable: boolean
  secondaryFailures?: Array<{
    stage: "encounter_transition" | "audio_cleanup"
    code: AppErrorCode
  }>
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: SerializableError }
