import type { ZodType } from "zod"
import type { Result } from "../../shared/types/result"
import {
  createAppError,
  isAppError,
  toSerializableError,
} from "../utils/app-error"
import type { SessionPort } from "../auth"

export type IpcLogger = {
  call: (entry: {
    channel: string
    status: "ok" | "error"
    latencyMs: number
    errorCode?: string
  }) => void
}

const invalidInputError = createAppError(
  "INVALID_INPUT",
  "The request was not valid.",
)

const invalidOutputError = createAppError(
  "INVALID_INPUT",
  "The response was not valid.",
)

const unauthenticatedError = createAppError(
  "NOT_AUTHENTICATED",
  "Unlock the app to continue.",
)

function failedResult(error: ReturnType<typeof createAppError>): Result<never> {
  return { ok: false, error: toSerializableError(error) }
}

export function withValidation<TIn, TOut>(options: {
  channel: string
  schema: ZodType<TIn>
  outputSchema: ZodType<TOut>
  requiresSession?: boolean
  session: SessionPort
  logger: IpcLogger
  run: (input: TIn) => Promise<TOut>
}): (raw: unknown) => Promise<Result<TOut>> {
  const { channel, schema, outputSchema, requiresSession, session, logger, run } =
    options

  return async (raw: unknown): Promise<Result<TOut>> => {
    const started = Date.now()
    const parsed = schema.safeParse(raw ?? {})
    if (!parsed.success) {
      logger.call({
        channel,
        status: "error",
        latencyMs: Date.now() - started,
        errorCode: "INVALID_INPUT",
      })
      return failedResult(invalidInputError)
    }

    if (requiresSession && !session.isAuthenticated()) {
      logger.call({
        channel,
        status: "error",
        latencyMs: Date.now() - started,
        errorCode: "NOT_AUTHENTICATED",
      })
      return failedResult(unauthenticatedError)
    }

    if (session.isAuthenticated()) session.touch()

    try {
      const data = await run(parsed.data)
      const output = outputSchema.safeParse(data)
      if (!output.success) {
        logger.call({
          channel,
          status: "error",
          latencyMs: Date.now() - started,
          errorCode: "INVALID_INPUT",
        })
        return failedResult(invalidOutputError)
      }
      logger.call({
        channel,
        status: "ok",
        latencyMs: Date.now() - started,
      })
      return { ok: true, data: output.data }
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : createAppError("DATABASE_ERROR", "The operation failed.", {
            retryable: true,
            cause: error,
          })
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
