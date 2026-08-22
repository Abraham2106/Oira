import type { AppErrorCode } from "../../shared/constants/app-error-codes"
import type { SerializableError } from "../../shared/types/result"

export type AppError = {
  code: AppErrorCode
  message: string
  hint?: string
  retryable: boolean
  cause?: unknown
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  options?: { hint?: string; retryable?: boolean; cause?: unknown },
): AppError {
  return {
    code,
    message,
    hint: options?.hint,
    retryable: options?.retryable ?? false,
    cause: options?.cause,
  }
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as AppError
  return typeof candidate.code === "string" && typeof candidate.message === "string"
}

export function toSerializableError(error: AppError): SerializableError {
  return {
    code: error.code,
    message: error.message,
    hint: error.hint,
    retryable: error.retryable,
  }
}
