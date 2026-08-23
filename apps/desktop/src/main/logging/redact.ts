import {
  LOG_ACTIONS,
  LOG_META_KEYS,
  type AllowedMetaKey,
  type LogAction,
  type LogEntry,
} from "./log.types"

const PATH_HINT = /(?:[A-Za-z]:\\|\/Users\/|\/home\/|tmp-audio|\\|\/)[^\s"]+/

export const LOG_CANARY = "XYZZY-CANARY-42"

function isLogAction(value: string): value is LogAction {
  return (LOG_ACTIONS as readonly string[]).includes(value)
}

function isMetaKey(value: string): value is AllowedMetaKey {
  return (LOG_META_KEYS as readonly string[]).includes(value)
}

function redactScalar(value: number | boolean | string): number | boolean | string {
  if (typeof value !== "string") return value
  if (value.includes(LOG_CANARY) || PATH_HINT.test(value)) return "[redacted]"
  return value
}

export function redactLogEntry(entry: Omit<LogEntry, "ts"> & { ts?: string }): LogEntry {
  const meta: LogEntry["meta"] = {}
  if (entry.meta) {
    for (const [key, value] of Object.entries(entry.meta)) {
      if (!isMetaKey(key) || value === undefined) continue
      meta[key] = redactScalar(value)
    }
  }

  const encounterId =
    typeof entry.encounterId === "string" && entry.encounterId.includes(LOG_CANARY)
      ? "[redacted]"
      : entry.encounterId

  return {
    ts: entry.ts ?? new Date().toISOString(),
    action: isLogAction(entry.action) ? entry.action : "app.event",
    status: entry.status,
    level: entry.level,
    latencyMs: entry.latencyMs,
    errorCode: entry.errorCode,
    encounterId,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  }
}
