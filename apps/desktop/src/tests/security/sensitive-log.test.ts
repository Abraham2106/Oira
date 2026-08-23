import { describe, expect, it } from "vitest"
import { createLogger } from "../../main/logging/logger"
import { LOG_CANARY } from "../../main/logging/redact"
import { SYNTHETIC_TEST_TRANSCRIPT } from "../fixtures/transcript.synthetic"

describe("sensitive log check", () => {
  it("does not persist a transcript canary", () => {
    const lines: string[] = []
    const logger = createLogger({ writeLine: (line) => lines.push(line) })
    logger.log({
      action: "transcription.run",
      status: "ok",
      meta: {
        model: SYNTHETIC_TEST_TRANSCRIPT.canary,
        segments: 1,
      },
    })
    logger.log({
      action: "ipc.handle",
      status: "ok",
      meta: {
        channel: SYNTHETIC_TEST_TRANSCRIPT.text,
      } as never,
    })
    const dump = lines.join("\n")
    expect(dump).not.toContain(LOG_CANARY)
    expect(dump).not.toContain(SYNTHETIC_TEST_TRANSCRIPT.text)
  })
})
