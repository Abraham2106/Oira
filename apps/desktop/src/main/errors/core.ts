import {
  isAppErrorCode,
  type AppErrorCode,
} from "../../shared/constants/app-error-codes"
import type { SerializableError } from "../../shared/types/result"

/** Runtime brand so duck-typed `{ code, message }` cannot pass as AppError. */
export const APP_ERROR_NAME = "NotaLocalAppError" as const

export type AppError = {
  readonly name: typeof APP_ERROR_NAME
  code: AppErrorCode
  /** Short, safe for UI — no PHI, paths, or stacks. */
  message: string
  hint?: string
  retryable: boolean
  /** Local diagnostics only; stripped before IPC. */
  cause?: unknown
}

export type CreateAppErrorOptions = {
  hint?: string
  retryable?: boolean
  cause?: unknown
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  options?: CreateAppErrorOptions,
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
  const candidate = value as Partial<AppError>
  return (
    candidate.name === APP_ERROR_NAME &&
    isAppErrorCode(candidate.code) &&
    typeof candidate.message === "string"
  )
}

export function toSerializableError(error: AppError): SerializableError {
  return {
    code: error.code,
    message: error.message,
    hint: error.hint,
    retryable: error.retryable,
  }
}
