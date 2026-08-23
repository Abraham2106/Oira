import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import type { IpcLogger, LogEntry, Logger } from "./log.types"
import { redactLogEntry } from "./redact"

const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export type LoggerDeps = {
  logsDir?: string
  now?: () => string
  writeLine?: (line: string) => void
}

export function createLogger(deps: LoggerDeps = {}): Logger {
  if (deps.logsDir) {
    mkdirSync(deps.logsDir, { recursive: true })
    rotateLogs(deps.logsDir)
  }

  const write =
    deps.writeLine ??
    ((line: string) => {
      if (!deps.logsDir) return
      const day = (deps.now?.() ?? new Date().toISOString()).slice(0, 10)
      appendFileSync(join(deps.logsDir, `notalocal-${day}.log`), `${line}\n`, "utf8")
    })

  return {
    log(entry) {
      const cleaned: LogEntry = redactLogEntry({
        ...entry,
        ts: entry.ts ?? deps.now?.() ?? new Date().toISOString(),
      })
      write(JSON.stringify(cleaned))
    },
  }
}

export function createIpcLogger(logger: Logger): IpcLogger {
  return {
    call(entry) {
      logger.log({
        action: "ipc.handle",
        status: entry.status,
        latencyMs: entry.latencyMs,
        errorCode: entry.errorCode as LogEntry["errorCode"],
        meta: { channel: entry.channel },
      })
    },
  }
}

function rotateLogs(logsDir: string): void {
  const cutoff = Date.now() - LOG_RETENTION_MS
  let entries: string[] = []
  try {
    entries = readdirSync(logsDir)
  } catch {
    return
  }
  for (const name of entries) {
    if (!name.endsWith(".log")) continue
    const filePath = join(logsDir, name)
    try {
      if (statSync(filePath).mtimeMs < cutoff) unlinkSync(filePath)
    } catch {
      // Keep going; rotation must not break logging.
    }
  }
}
