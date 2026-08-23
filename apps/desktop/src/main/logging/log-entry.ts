import type { AppErrorCode } from "../../shared/constants/app-error-codes"

export const LOG_STATUSES = ["ok", "error", "cancelled"] as const

export type LogStatus = (typeof LOG_STATUSES)[number]

/** Scalars only — never clinical content (guide §12.1). */
export type LogMetaValue = number | boolean | string

/**
 * The only shape the logger accepts. There is deliberately no
 * `logger.info(string)`: if free text cannot be passed, it cannot leak.
 */
export type LogEntry = {
  /** UTC ISO-8601; the logger fills it when omitted. */
  ts?: string
  /** Stable operation name, e.g. `ipc.oira:notes:save`. */
  action: string
  status: LogStatus
  latencyMs?: number
  errorCode?: AppErrorCode
  /** Opaque UUID, never patient content. */
  encounterId?: string
  meta?: Record<string, LogMetaValue>
}
