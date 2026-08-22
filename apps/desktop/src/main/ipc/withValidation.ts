import type { ZodType } from "zod"
import type { Result } from "../../shared/types/result"
import {
  invalidInputError,
  notAuthenticatedError,
  toAppError,
} from "../errors/ipc"
import { toSerializableError } from "../errors/core"
import type { SessionPort } from "../auth"

export type IpcLogger = {
  call: (entry: {
    channel: string
    status: "ok" | "error"
    latencyMs: number
    errorCode?: string
  }) => void
}

function failedResult(
  error: ReturnType<typeof toAppError>,
): Result<never> {
  return { ok: false, error: toSerializableError(error) }
}

export function withValidation<TIn, TOut>(options: {
  channel: string
  schema: ZodType<TIn>
  requiresSession?: boolean
  session: SessionPort
  logger: IpcLogger
  run: (input: TIn) => Promise<TOut>
}): (raw: unknown) => Promise<Result<TOut>> {
  const { channel, schema, requiresSession, session, logger, run } = options

  return async (raw: unknown): Promise<Result<TOut>> => {
    const started = Date.now()
    const parsed = schema.safeParse(raw ?? {})
    if (!parsed.success) {
      const error = invalidInputError()
      logger.call({
        channel,
        status: "error",
        latencyMs: Date.now() - started,
        errorCode: error.code,
      })
      return failedResult(error)
    }

    if (requiresSession && !session.isAuthenticated()) {
      const error = notAuthenticatedError()
      logger.call({
        channel,
        status: "error",
        latencyMs: Date.now() - started,
        errorCode: error.code,
      })
      return failedResult(error)
    }

    try {
      const data = await run(parsed.data)
      logger.call({
        channel,
        status: "ok",
        latencyMs: Date.now() - started,
      })
      return { ok: true, data }
    } catch (error) {
      const appError = toAppError(error)
      logger.call({
        channel,
        status: "error",
        latencyMs: Date.now() - started,
        errorCode: appError.code,
      })
      return failedResult(appError)
    }
  }
}
