import { describe, expect, it } from "vitest"
import { createLogger } from "../../main/logging/logger"
import { LOG_CANARY, redactLogEntry } from "../../main/logging/redact"

describe("redactLogEntry", () => {
  it("drops unknown meta keys and path-like values", () => {
    const cleaned = redactLogEntry({
      action: "ipc.handle",
      status: "ok",
      meta: {
        channel: "notalocal:notes:save",
        transcript: "el paciente refiere dolor",
        model: "C:\\Users\\dr.lopez\\tmp-audio\\capture.wav",
      } as never,
    })
    expect(cleaned.meta).toEqual({
      channel: "notalocal:notes:save",
      model: "[redacted]",
    })
    expect(JSON.stringify(cleaned)).not.toContain("dolor")
  })
})

describe("createLogger", () => {
  it("never writes the canary even if a caller smuggles it", () => {
    const lines: string[] = []
    const logger = createLogger({
      writeLine: (line) => lines.push(line),
      now: () => "2026-01-01T00:00:00.000Z",
    })
    logger.log({
      action: "notes.structure",
      status: "error",
      errorCode: "INVALID_STRUCTURED_OUTPUT",
      meta: {
        model: LOG_CANARY,
        channel: `prompt ${LOG_CANARY}`,
      },
    })
    expect(lines.join("\n")).not.toContain(LOG_CANARY)
  })
})
