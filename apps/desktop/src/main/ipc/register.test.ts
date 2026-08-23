import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { IPC_CHANNELS } from "../../shared/constants/ipc-channels"
import type { InferenceProgress } from "../../shared/types/inference-progress"
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
      data?: { transcript: unknown[]; note: { sections: Record<string, unknown> } }
      error?: { code: string }
    }

    expect(result.ok).toBe(true)
    expect(result.data?.transcript).toHaveLength(3)
    expect(Object.keys(result.data?.note.sections ?? {}).sort()).toEqual([
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
})
