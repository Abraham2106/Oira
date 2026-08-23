import { describe, expect, it } from "vitest"
import { defaultSettings } from "../config/settings.schema"
import {
  FAILED_AUDIO_RETENTION_MS,
  planRetention,
} from "./retention.policy"
import type { RetentionTarget } from "./retention.policy"

const ID = "11111111-1111-4111-8111-111111111111"

function target(
  overrides: Partial<RetentionTarget> & Pick<RetentionTarget, "status">,
): RetentionTarget {
  return {
    encounterId: ID,
    completedAt: null,
    endedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    hasTranscript: true,
    ...overrides,
  }
}

describe("planRetention", () => {
  it("purges a discarded encounter entirely", () => {
    const actions = planRetention(
      [target({ status: "discarded" })],
      defaultSettings,
      new Date("2026-01-02T00:00:00.000Z"),
    )
    expect(actions).toEqual([{ type: "purge-encounter", encounterId: ID }])
  })

  it("removes audio after the note is approved", () => {
    const actions = planRetention(
      [target({ status: "completed", completedAt: "2026-01-01T00:02:00.000Z" })],
      defaultSettings,
      new Date("2026-01-01T00:03:00.000Z"),
    )
    expect(actions).toContainEqual({ type: "purge-audio", encounterId: ID })
    expect(actions.some((action) => action.type === "purge-encounter")).toBe(
      false,
    )
  })

  it("removes audio 24h after a failed transcription", () => {
    const now = new Date("2026-01-02T01:00:00.000Z")
    const endedAt = new Date(now.getTime() - FAILED_AUDIO_RETENTION_MS).toISOString()
    const actions = planRetention(
      [target({ status: "failed", endedAt, hasTranscript: false })],
      defaultSettings,
      now,
    )
    expect(actions).toEqual([{ type: "purge-audio", encounterId: ID }])
  })
})
