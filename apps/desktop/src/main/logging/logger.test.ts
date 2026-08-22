import { describe, expect, it } from "vitest"
import { createLogger } from "./logger"

const SENTINEL = "XYZZY-CANARY-42"

function collect() {
  const lines: string[] = []
  const logger = createLogger({
    sink: (line) => lines.push(line),
    now: () => new Date("2026-08-22T10:00:00.000Z"),
  })
  return { lines, logger }
}

describe("logging/logger", () => {
  it("writes one JSON line with scalars only", () => {
    const { lines, logger } = collect()
    logger.log({
      action: "transcription.run",
      status: "ok",
      latencyMs: 48210,
      encounterId: "0f1c8f4e-1c3a-4c2b-9f7d-2b6a5c4d3e2f",
      meta: { segments: 37, format: "json" },
    })

    expect(JSON.parse(lines[0])).toEqual({
      ts: "2026-08-22T10:00:00.000Z",
      action: "transcription.run",
      status: "ok",
      latencyMs: 48210,
      encounterId: "0f1c8f4e-1c3a-4c2b-9f7d-2b6a5c4d3e2f",
      meta: { segments: 37, format: "json" },
    })
  })

  it("drops a clinical payload smuggled through meta (PHI sentinel)", () => {
    const { lines, logger } = collect()
    logger.log({
      action: "notes.structure",
      status: "error",
      errorCode: "INVALID_STRUCTURED_OUTPUT",
      meta: {
        transcript: `el paciente refiere ${SENTINEL}`,
        note: SENTINEL,
        format: SENTINEL,
        attempt: 2,
      } as never,
    })

    const line = lines[0]
    expect(line).not.toContain(SENTINEL)
    expect(JSON.parse(line)).toEqual({
      ts: "2026-08-22T10:00:00.000Z",
      action: "notes.structure",
      status: "error",
      errorCode: "INVALID_STRUCTURED_OUTPUT",
      meta: { attempt: 2 },
    })
  })

  it("drops unknown error codes and non-UUID encounter ids", () => {
    const { lines, logger } = collect()
    logger.log({
      action: "ipc.call",
      status: "error",
      errorCode: "MADE_UP_CODE" as never,
      encounterId: "/Users/dr.lopez/tmp-audio/gonzalez-maria.wav",
    })

    const parsed = JSON.parse(lines[0]) as Record<string, unknown>
    expect(parsed.errorCode).toBeUndefined()
    expect(parsed.encounterId).toBeUndefined()
    expect(lines[0]).not.toContain("gonzalez")
  })
})
