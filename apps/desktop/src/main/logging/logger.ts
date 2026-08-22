import { isAppErrorCode } from "../../shared/constants/app-error-codes"
import type { LogEntry } from "./log-entry"
import { sanitizeEncounterId, sanitizeMeta } from "./redact"

export type LogSink = (line: string) => void

export type Logger = {
  log: (entry: LogEntry) => void
}

export type CreateLoggerOptions = {
  /** Defaults to stdout; logs stay local (guide §12.4 — no remote sink). */
  sink?: LogSink
  now?: () => Date
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const sink = options.sink ?? ((line: string) => console.info(line))
  const now = options.now ?? (() => new Date())

  return {
    log(entry) {
      const safe = {
        ts: entry.ts ?? now().toISOString(),
        action: entry.action,
        status: entry.status,
        latencyMs:
          typeof entry.latencyMs === "number" && Number.isFinite(entry.latencyMs)
            ? entry.latencyMs
            : undefined,
        errorCode: isAppErrorCode(entry.errorCode) ? entry.errorCode : undefined,
        encounterId: sanitizeEncounterId(entry.encounterId),
        meta: sanitizeMeta(entry.meta),
      }

      sink(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(safe).filter(([, value]) => value !== undefined),
          ),
        ),
      )
    },
  }
}
