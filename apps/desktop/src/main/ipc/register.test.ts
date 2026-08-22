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

  it.each([{ unexpected: true }, { label: "Consulta" }, { visitType: "first" }])(
    "rejects unsupported startEncounter payload %j with INVALID_INPUT",
    async (payload) => {
      const ipc = createMemoryIpc()
      registerIpc(ipc.handle, createStubIpcDeps())

      const result = (await ipc.invoke(
        IPC_CHANNELS.START_ENCOUNTER,
        payload,
      )) as { ok: boolean; error?: { code: string } }

      expect(result).toEqual({
        ok: false,
        error: expect.objectContaining({ code: "INVALID_INPUT" }),
      })
    },
  )

  it("generateNote is honest NOT_IMPLEMENTED, not an empty draft", async () => {
    const ipc = createMemoryIpc()
    registerIpc(ipc.handle, createStubIpcDeps())
    const started = (await ipc.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      data: { encounterId: string }
    }

    const result = (await ipc.invoke(IPC_CHANNELS.GENERATE_NOTE, {
      encounterId: started.data.encounterId,
    })) as { ok: boolean; error?: { code: string } }

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe("NOT_IMPLEMENTED")
  })

})
