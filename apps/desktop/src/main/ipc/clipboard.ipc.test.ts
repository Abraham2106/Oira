import { describe, expect, it, vi } from "vitest"
import { IPC_CHANNELS } from "../../shared/constants/ipc-channels"
import { createAuthStub, type SessionPort } from "../auth"
import { createSilentIpcLogger } from "./index"
import { registerClipboardIpc, type ClipboardPort } from "./clipboard.ipc"

function createMemoryIpc() {
  const handlers = new Map<string, (event: unknown, raw: unknown) => unknown>()
  return {
    handle(channel: string, listener: (event: unknown, raw: unknown) => unknown) {
      handlers.set(channel, listener)
    },
    invoke(channel: string, raw?: unknown) {
      const listener = handlers.get(channel)
      if (!listener) throw new Error(`No handler for ${channel}`)
      return Promise.resolve(listener(undefined, raw))
    },
  }
}

const session: SessionPort = createAuthStub()

describe("registerClipboardIpc", () => {
  it("writes the text through the clipboard port", async () => {
    const ipc = createMemoryIpc()
    const clipboard: ClipboardPort = { writeText: vi.fn() }
    registerClipboardIpc(ipc.handle, {
      clipboard,
      session,
      logger: createSilentIpcLogger(),
    })

    const result = (await ipc.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, {
      text: "Nota clínica",
    })) as { ok: boolean; data?: { written: boolean } }

    expect(result.ok).toBe(true)
    expect(result.data?.written).toBe(true)
    expect(clipboard.writeText).toHaveBeenCalledWith("Nota clínica")
  })

  it("rejects empty text with INVALID_INPUT without touching the port", async () => {
    const ipc = createMemoryIpc()
    const clipboard: ClipboardPort = { writeText: vi.fn() }
    registerClipboardIpc(ipc.handle, {
      clipboard,
      session,
      logger: createSilentIpcLogger(),
    })

    const result = (await ipc.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, {
      text: "",
    })) as { ok: boolean; error?: { code: string } }

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe("INVALID_INPUT")
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })
})
