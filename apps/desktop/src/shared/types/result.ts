import type { AppErrorCode } from "../constants/app-error-codes"

export type SerializableError = {
  code: AppErrorCode
  message: string
  hint?: string
  retryable: boolean
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: SerializableError }
