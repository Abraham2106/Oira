import { describe, expect, it } from "vitest"
import { encounterNotFoundError } from "../errors/encounters"
import { createMockStructuring, createMockTranscription } from "../inference/mock"
import { runGenerateNote } from "./generate-note"
import { invalidStructuredOutputError } from "../errors/notes"

describe("runGenerateNote", () => {
  it("starts model handoff while the UI is still displaying the transcript", async () => {
    const events: string[] = []
    let finishLoading!: () => void
    let markHandoffStarted!: () => void
    let finishDisplay!: () => void
    const loading = new Promise<void>((resolve) => { finishLoading = resolve })
    const handoffStarted = new Promise<void>((resolve) => { markHandoffStarted = resolve })
    const displaying = new Promise<void>((resolve) => { finishDisplay = resolve })
    const mockStructuring = createMockStructuring()
    const result = runGenerateNote("00000000-0000-4000-8000-000000000001", {
      transcription: createMockTranscription(),
      progress: {
        emit: (event) => {
          if (event.phase !== "structuring") return
          events.push("display-started")
          return displaying
        },
      },
      inferenceRuntime: {
        warmTranscription: async () => {},
        shutdown: async () => {},
        handoffToStructuring: () => {
          events.push("handoff-started")
          markHandoffStarted()
          return loading
        },
      },
      structuring: {
        structure: (input) => {
          events.push("structure-started")
          return mockStructuring.structure(input)
        },
      },
    })
    try {
      await handoffStarted
      expect(events).toEqual(["display-started", "handoff-started"])
      finishLoading()
      await expect(result).resolves.toMatchObject({ status: "ok" })
      expect(events).toEqual(["display-started", "handoff-started", "structure-started"])
    } finally {
      finishLoading()
      finishDisplay()
      await result
    }
  })

  it("rejects an empty encounter id before calling adapters", async () => {
    const transcription = createMockTranscription()
    await expect(
      runGenerateNote("  ", {
        transcription,
        structuring: createMockStructuring(),
      }),
    ).rejects.toMatchObject(encounterNotFoundError())
  })

  it("returns a seven-section draft from injected ports", async () => {
    const events: Array<{ phase: string; transcript?: unknown; stage?: string }> = []
    const result = await runGenerateNote("00000000-0000-4000-8000-000000000001", {
      transcription: createMockTranscription(),
      structuring: createMockStructuring(),
      progress: { emit: (event) => events.push(event) },
    })
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.transcript).toHaveLength(3)
    expect(Object.keys(result.note.sections)).toHaveLength(7)
    expect(events.map((event) => event.phase)).toEqual(["transcribing", "structuring"])
    expect(events[1]?.transcript).toEqual(result.transcript)
  })

  it("returns a draft_unvalidated outcome that keeps the transcript and issues", async () => {
    const events: Array<{ phase: string; transcript?: unknown; stage?: string }> = []
    const result = await runGenerateNote("00000000-0000-4000-8000-000000000001", {
      transcription: createMockTranscription(),
      structuring: {
        structure: async () => ({
          kind: "draft_unvalidated",
          draftText: "{\"sections\": ...crudo",
          issues: [{ code: "MISSING_SECTION", message: "Falta una sección." }],
        }),
      },
      progress: { emit: (event) => events.push(event) },
    })
    expect(result.status).toBe("draft_unvalidated")
    if (result.status !== "draft_unvalidated") return
    expect(result.transcript).toHaveLength(3)
    expect(result.draftText).toContain("sections")
    expect(result.issues[0]).toMatchObject({
      code: "MISSING_SECTION",
      message: "Falta una sección.",
    })
    expect(events.map((event) => event.phase)).toEqual([
      "transcribing",
      "structuring",
      "failed",
    ])
    expect(events.at(-1)).toMatchObject({ stage: "structuring" })
  })

  it("keeps the transcript when structuring fails", async () => {
    const events: Array<{ phase: string; transcript?: unknown; stage?: string }> = []
    await expect(
      runGenerateNote("00000000-0000-4000-8000-000000000001", {
        transcription: createMockTranscription(),
        structuring: { structure: async () => { throw invalidStructuredOutputError() } },
        progress: { emit: (event) => events.push(event) },
      }),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURED_OUTPUT" })
    expect(events.at(-1)).toMatchObject({ phase: "failed", stage: "structuring" })
    expect(events.at(-1)?.transcript).toBeDefined()
  })
})
