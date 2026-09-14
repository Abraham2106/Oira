import { describe, expect, it, vi } from "vitest"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../shared/fixtures/synthetic-consult"
import { IPC_CHANNELS } from "../shared/constants/ipc-channels"
import { invalidStructuredOutputError } from "./errors/notes"
import { runGenerateNote } from "./application/generate-note"
import { createNotesService } from "./notes/notes.service"
import { createMockStructuring } from "./inference/mock"
import { validateStructuringOutput } from "./structure/schema"
import { createStubIpcDeps, registerIpc, type IpcHandle } from "./ipc"
import { withTrustedIpcSender } from "./ipc/sender-guard"

const ENCOUNTER = "00000000-0000-4000-8000-000000000001"
const TRANSCRIPT = [
  { id: "seg-1", speaker: "Paciente" as const, startMs: 0, text: "Dolor." },
]

function audioFor(purge: ReturnType<typeof vi.fn>) {
  return {
    prepare() {},
    append() {},
    finalize: () => "synthetic.wav",
    wavPath: () => "synthetic.wav",
    purge,
  }
}

describe("OIRA-REF-01 contracts before the fixes", () => {
  it("S1 rejects generated stated text without a source", async () => {
    const note = syntheticClinicalNote()
    note.sections.visit_context.sourceSegmentIds = []
    await expect(
      runGenerateNote(ENCOUNTER, {
        transcription: { transcribe: async () => ({ segments: SYNTHETIC_TRANSCRIPT }) },
        structuring: { structure: async () => ({ note }) },
      }),
    ).rejects.toMatchObject(invalidStructuredOutputError())
  })

  it("S2 preserves a missing citation for an identifiable rejection", () => {
    const result = validateStructuringOutput(
      {
        sections: {
          clinical_narrative: {
            presence: "STATED",
            text: "Dolor.",
            sourceSegmentIds: ["missing"],
          },
        },
      },
      ["seg-1"],
    )
    expect(result.ok).toBe(false)
  })

  it("S3 shares one in-flight generation for the same encounter", async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const transcribe = vi.fn(async () => {
      await pending
      return { segments: SYNTHETIC_TRANSCRIPT }
    })
    const structure = vi.fn(async () => ({ note: syntheticClinicalNote() }))
    const purge = vi.fn()
    const notes = createNotesService({
      transcription: { transcribe },
      structuring: { structure },
      audio: audioFor(purge),
    })
    const first = notes.generate(ENCOUNTER)
    await Promise.resolve()
    const second = notes.generate(ENCOUNTER)
    try {
      expect(transcribe).toHaveBeenCalledTimes(1)
    } finally {
      release()
    }
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(structure).toHaveBeenCalledTimes(1)
    expect(purge).toHaveBeenCalledTimes(1)
    firstResult.note.sections.clinical_narrative.text = "Mutaci\u00f3n local"
    expect(secondResult.note.sections.clinical_narrative.text).not.toBe("Mutaci\u00f3n local")
  })

  it("S3 clears a failed in-flight generation before allowing a retry", async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const transcribe = vi.fn(async () => {
      await pending
      return { segments: SYNTHETIC_TRANSCRIPT }
    })
    const structure = vi.fn(async () => {
      throw invalidStructuredOutputError()
    })
    const purge = vi.fn()
    const notes = createNotesService({
      transcription: { transcribe },
      structuring: { structure },
      audio: audioFor(purge),
    })

    const first = notes.generate(ENCOUNTER)
    await Promise.resolve()
    const second = notes.generate(ENCOUNTER)
    expect(transcribe).toHaveBeenCalledTimes(1)
    release()

    await expect(Promise.all([first, second])).rejects.toMatchObject(
      invalidStructuredOutputError(),
    )
    expect(purge).toHaveBeenCalledTimes(1)

    const retry = notes.generate(ENCOUNTER)
    await Promise.resolve()
    expect(transcribe).toHaveBeenCalledTimes(2)
    await expect(retry).rejects.toMatchObject(invalidStructuredOutputError())
    expect(purge).toHaveBeenCalledTimes(2)
  })

  it("S3 never shares in-flight work between different encounters", async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const transcribe = vi.fn(async () => {
      await pending
      return { segments: SYNTHETIC_TRANSCRIPT }
    })
    const structure = vi.fn(async () => ({ note: syntheticClinicalNote() }))
    const purge = vi.fn()
    const notes = createNotesService({
      transcription: { transcribe },
      structuring: { structure },
      audio: audioFor(purge),
    })

    const first = notes.generate(ENCOUNTER)
    const second = notes.generate("00000000-0000-4000-8000-000000000002")
    await Promise.resolve()
    expect(transcribe).toHaveBeenCalledTimes(2)
    release()
    await Promise.all([first, second])

    expect(structure).toHaveBeenCalledTimes(2)
    expect(purge).toHaveBeenCalledTimes(2)
  })

  it("S4 exposes a failed success-path encounter transition", async () => {
    await expect(
      runGenerateNote(ENCOUNTER, {
        transcription: { transcribe: async () => ({ segments: SYNTHETIC_TRANSCRIPT }) },
        structuring: createMockStructuring(),
        encounters: {
          getById: async () => ({ id: ENCOUNTER }),
          advance: async () => {
            throw new Error("transition failed")
          },
        } as never,
      }),
    ).rejects.toThrow("transition failed")
  })

  it("S5 preserves an inference failure when cleanup also fails", async () => {
    await expect(
      runGenerateNote(ENCOUNTER, {
        transcription: { transcribe: async () => ({ segments: TRANSCRIPT }) },
        structuring: { structure: async () => { throw invalidStructuredOutputError() } },
        audio: {
          wavPath: () => "synthetic.wav",
          purge: () => {
            throw new Error("purge failed")
          },
        } as never,
      }),
    ).rejects.toMatchObject({
      ...invalidStructuredOutputError(),
      secondaryFailures: [{ stage: "audio_cleanup", code: "INTERNAL_ERROR" }],
    })
  })

  it("S4 keeps a failed recovery transition as a secondary cause", async () => {
    await expect(
      runGenerateNote(ENCOUNTER, {
        transcription: { transcribe: async () => ({ segments: TRANSCRIPT }) },
        structuring: { structure: async () => { throw invalidStructuredOutputError() } },
        encounters: {
          getById: async () => ({ id: ENCOUNTER }),
          advance: async () => { throw new Error("transition failed") },
        } as never,
      }),
    ).rejects.toMatchObject({
      ...invalidStructuredOutputError(),
      secondaryFailures: [{ stage: "encounter_transition", code: "INTERNAL_ERROR" }],
    })
  })

  it("S6 rejects an IPC event without an authorized sender before dispatch", async () => {
    const handlers = new Map<string, (event: unknown, raw: unknown) => unknown>()
    const handle: IpcHandle = (channel, listener) => {
      handlers.set(channel, listener)
    }
    registerIpc(
      withTrustedIpcSender(handle, () => [{ webContentsId: 1, url: "http://localhost:5173/" }]),
      createStubIpcDeps(),
    )
    const listener = handlers.get(IPC_CHANNELS.START_ENCOUNTER)
    expect(listener).toBeDefined()
    const result = await listener?.({ sender: {} }, {})
    expect(result).toMatchObject({
      ok: false,
      error: { code: "IPC_SENDER_UNAUTHORIZED" },
    })
  })
})
