import type { AppErrorCode } from "../../shared/constants/app-error-codes"

export const LOG_ACTIONS = [
  "ipc.handle",
  "transcription.run",
  "notes.structure",
  "audio.cleanup",
  "privacy.purge",
  "export.write",
  "model.load",
  "main.boot",
  "app.event",
] as const

export type LogAction = (typeof LOG_ACTIONS)[number]

export const LOG_META_KEYS = [
  "channel",
  "audioDurationMs",
  "segments",
  "model",
  "attempt",
  "filesDeleted",
  "format",
  "orphanAudioDirs",
] as const

export type AllowedMetaKey = (typeof LOG_META_KEYS)[number]

export type LogStatus = "ok" | "error" | "cancelled"

export type LogLevel = "info" | "warn" | "error" | "debug"

export type LogEntry = {
  ts: string
  action: LogAction
  status: LogStatus
  level?: LogLevel
  latencyMs?: number
  errorCode?: AppErrorCode
  encounterId?: string
  meta?: Partial<Record<AllowedMetaKey, number | boolean | string>>
}

export type Logger = {
  log: (entry: Omit<LogEntry, "ts"> & { ts?: string }) => void
}

export type IpcLogger = {
  call: (entry: {
    channel: string
    status: "ok" | "error"
    latencyMs: number
    errorCode?: string
  }) => void
}
