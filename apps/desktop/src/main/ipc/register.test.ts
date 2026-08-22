import { describe, expect, it } from "vitest"
import { IPC_CHANNELS } from "../../shared/constants/ipc-channels"
import { createStubIpcDeps, registerIpc, type IpcHandle } from "./index"

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

})
