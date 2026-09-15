import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { IPC_CHANNELS } from "../../shared/constants/ipc-channels"
import { syntheticClinicalNote } from "../../shared/fixtures/synthetic-consult"
import type { GenerateNoteResult } from "../../shared/types/oira-api"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import { createAuthStub } from "../auth"
import { createAudioTempStore } from "../audio"
import {
  createSilentIpcLogger,
  createStubIpcDeps,
  registerIpc,
  type IpcHandle,
} from "./index"

function createMemoryIpc(): {
  handle: IpcHandle
  invoke: (channel: string, raw?: unknown) => Promise<unknown>
} {
  const handlers = new Map<
    string,
    (event: unknown, raw: unknown) => unknown
  >()
  return {
    handle(channel, listener) {
      handlers.set(channel, listener)
    },
    invoke(channel, raw) {
      const listener = handlers.get(channel)
      if (!listener) {
        throw new Error(`No handler for ${channel}`)
      }
      return Promise.resolve(listener(undefined, raw))
    },
  }
}

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("I04 registerIpc", () => {
  it("warms Whisper without creating a recording encounter", async () => {
    const ipc = createMemoryIpc()
    let warmCalls = 0
    registerIpc(
      ipc.handle,
      createStubIpcDeps(createSilentIpcLogger(), {
        inferenceRuntime: {
          warmTranscription: async () => {
            warmCalls += 1
          },
          handoffToStructuring: async () => undefined,
          shutdown: async () => undefined,
          completeQwen: async () => "",
        },
      }),
    )

    const result = (await ipc.invoke(IPC_CHANNELS.WARM_TRANSCRIPTION, {})) as {
      ok: boolean
      data?: { warmed: boolean }
    }

    expect(result).toEqual({ ok: true, data: { warmed: true } })
    expect(warmCalls).toBe(1)
  })

  it("startEncounter({}) returns a typed ok Result", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())

    const result = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      ok: boolean
      data?: { encounterId: string }
      error?: { code: string; message: string }
    }

    expect(result.ok).toBe(true)
    expect(result.data?.encounterId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("stack")
    expect(serialized).not.toContain("cause")
    expect(serialized).not.toMatch(/\/home\/|\/Users\/|C:\\\\/i)
  })

  it("rejects unknown startEncounter fields with INVALID_INPUT", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())

    const result = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {
      unexpected: true,
    })) as { ok: boolean; error?: { code: string } }

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_INPUT" }),
    })
  })

  it("generateNote returns a structured draft with seven sections", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const started = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {
      label: "demo",
    })) as {
      ok: boolean
      data: { encounterId: string; startedAt: string }
    }

    expect(started.ok).toBe(true)
    expect(started.data.startedAt).toEqual(expect.any(String))

    const appended = (await ipc.invoke(IPC_CHANNELS.APPEND_AUDIO, {
      encounterId: started.data.encounterId,
      sequence: 0,
      pcm: Array.from(Buffer.alloc(320)),
    })) as { ok: boolean }
    expect(appended.ok).toBe(true)
    await ipc.invoke(IPC_CHANNELS.STOP_ENCOUNTER, {
      encounterId: started.data.encounterId,
    })

    const result = (await ipc.invoke(IPC_CHANNELS.GENERATE_NOTE, {
      encounterId: started.data.encounterId,
    })) as {
      ok: boolean
      data?: GenerateNoteResult
      error?: { code: string }
    }

    expect(result.ok).toBe(true)
    expect(result.data?.status).toBe("ok")
    if (result.data?.status !== "ok") return
    expect(result.data.transcript).toHaveLength(3)
    expect(Object.keys(result.data.note.sections).sort()).toEqual([
      "clinical_narrative",
      "clinician_documented_assessment",
      "clinician_documented_plan",
      "follow_up",
      "relevant_history",
      "reported_findings",
      "visit_context",
    ])
  })

  it("rejects a filesystem path on appendAudio and purges wav after generate", async () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-ipc-"))
    dirs.push(audioTempDir)
    const audio = createAudioTempStore({ audioTempDir })
    const phases: InferenceProgress["phase"][] = []
    const ipc = createMemoryIpc()
    registerIpc(
      ipc.handle,
      createStubIpcDeps(createSilentIpcLogger(), {
        audio,
        onProgress: (event) => phases.push(event.phase),
      }),
    )

    const started = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      ok: boolean
      data: { encounterId: string }
    }
    expect(started.ok).toBe(true)
    const encounterId = started.data.encounterId

    const rejected = (await ipc.invoke(IPC_CHANNELS.APPEND_AUDIO, {
      encounterId: join(audioTempDir, "secret.wav"),
      sequence: 0,
      pcm: [0, 0],
    })) as { ok: boolean; error?: { code: string } }
    expect(rejected).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_INPUT" }),
    })

    const appended = (await ipc.invoke(IPC_CHANNELS.APPEND_AUDIO, {
      encounterId,
      sequence: 0,
      pcm: Array.from(Buffer.alloc(320)),
    })) as { ok: boolean }
    expect(appended.ok).toBe(true)

    await ipc.invoke(IPC_CHANNELS.STOP_ENCOUNTER, { encounterId })
    expect(existsSync(join(audioTempDir, encounterId, "capture.wav"))).toBe(true)

    const generated = (await ipc.invoke(IPC_CHANNELS.GENERATE_NOTE, {
      encounterId,
    })) as { ok: boolean }
    expect(generated.ok).toBe(true)
    expect(phases).toEqual(["transcribing", "structuring"])
    expect(existsSync(join(audioTempDir, encounterId))).toBe(false)
  })

  it("generateNote inyecta la revisión F3 cuando hay runtime Qwen", async () => {
    const ipc = createMemoryIpc()
    registerIpc(
      ipc.handle,
      createStubIpcDeps(createSilentIpcLogger(), {
        inferenceRuntime: {
          warmTranscription: async () => undefined,
          handoffToStructuring: async () => undefined,
          shutdown: async () => undefined,
          completeQwen: async () => "",
        },
      }),
    )
    const started = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      ok: boolean
      data: { encounterId: string }
    }
    const appended = (await ipc.invoke(IPC_CHANNELS.APPEND_AUDIO, {
      encounterId: started.data.encounterId,
      sequence: 0,
      pcm: Array.from(Buffer.alloc(320)),
    })) as { ok: boolean }
    expect(appended.ok).toBe(true)
    await ipc.invoke(IPC_CHANNELS.STOP_ENCOUNTER, {
      encounterId: started.data.encounterId,
    })

    const result = (await ipc.invoke(IPC_CHANNELS.GENERATE_NOTE, {
      encounterId: started.data.encounterId,
    })) as {
      ok: boolean
      data?: GenerateNoteResult
    }

    expect(result.ok).toBe(true)
    expect(result.data?.status).toBe("ok")
    // El runtime stub entrega "" al revisor → JSON inválido → not_completed.
    // Informativo: la nota sigue siendo ok; el revisor nunca la bloquea.
    if (result.data?.status === "ok") {
      expect(result.data.reviewerResult).toEqual({
        status: "not_completed",
        error: expect.stringContaining("JSON"),
      })
    }
  })

  it("fails generateNote without a wav instead of passing the encounter id as a path", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const started = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      ok: boolean
      data: { encounterId: string }
    }
    const result = (await ipc.invoke(IPC_CHANNELS.GENERATE_NOTE, {
      encounterId: started.data.encounterId,
    })) as { ok: boolean; error?: { code: string } }
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AUDIO_CAPTURE_FAILED" }),
    })
  })

  it("rejects clinical channels when the session is not authenticated", async () => {
    const ipc = createMemoryIpc()
    registerIpc(
      ipc.handle,
      createStubIpcDeps(createSilentIpcLogger(), {
        session: createAuthStub(),
      }),
    )

    const result = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      ok: boolean
      error?: { code: string }
    }

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "NOT_AUTHENTICATED" }),
    })

    const session = (await ipc.invoke(IPC_CHANNELS.AUTH_SESSION_GET, {})) as {
      ok: boolean
      data?: { authenticated: boolean }
    }
    expect(session.ok).toBe(true)
    expect(session.data?.authenticated).toBe(false)
  })

  it("rejects SAVE_NOTE without clinician confirmation", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const result = await ipc.invoke(IPC_CHANNELS.SAVE_NOTE, {
      encounterId: "00000000-0000-4000-8000-000000000001",
      note: syntheticClinicalNote(),
    }) as { ok: boolean; error?: { code: string } }
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_INPUT" }),
    })
  })

  it("rejects SAVE_NOTE without a generated draft", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const started = await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {}) as {
      data: { encounterId: string }
    }
    const result = await ipc.invoke(IPC_CHANNELS.SAVE_NOTE, {
      encounterId: started.data.encounterId,
      note: syntheticClinicalNote(),
      clinicianConfirmed: true,
    }) as { ok: boolean; error?: { code: string } }
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "INVALID_STATE_TRANSITION" }),
    })
  })

  it("rejects EXPORT_NOTE when the encounter has no accepted note", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const started = await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {}) as {
      data: { encounterId: string }
    }
    const result = await ipc.invoke(IPC_CHANNELS.EXPORT_NOTE, {
      encounterId: started.data.encounterId,
      format: "txt",
    }) as { ok: boolean; error?: { code: string } }
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "EXPORT_FAILED" }),
    })
  })
})
