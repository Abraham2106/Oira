import { APP_ERROR_CODES, type AppErrorCode } from "../../shared/constants/app-error-codes"
import type { SerializableError } from "../../shared/types/result"

export const APP_ERROR_NAME = "NotaLocalAppError"

export type AppError = {
  name: typeof APP_ERROR_NAME
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
    name: APP_ERROR_NAME,
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
  if (candidate.name !== APP_ERROR_NAME) return false
  if (typeof candidate.message !== "string") return false
  return (APP_ERROR_CODES as readonly string[]).includes(candidate.code)
}

export function toSerializableError(error: AppError): SerializableError {
  return {
    code: error.code,
    message: error.message,
    hint: error.hint,
    retryable: error.retryable,
  }
}
