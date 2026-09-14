import { describe, expect, it, vi } from "vitest"
import { withTrustedIpcSender } from "./sender-guard"
import type { IpcHandle } from "./types"

const TRUSTED = { webContentsId: 7, url: "http://localhost:5173/" }

function guardedHandler() {
  let registered: ((event: unknown, raw: unknown) => unknown) | undefined
  const base: IpcHandle = (_channel, listener) => {
    registered = listener
  }
  const listener = vi.fn(() => ({ ok: true, data: "dispatched" }))
  withTrustedIpcSender(base, () => [TRUSTED])("notalocal:test", listener)
  return { invoke: (event: unknown) => registered?.(event, {}), listener }
}

function event(overrides: {
  senderId?: number
  senderUrl?: string
  isMainFrame?: boolean
  frameUrl?: string
} = {}) {
  const senderUrl = overrides.senderUrl ?? TRUSTED.url
  return {
    sender: { id: overrides.senderId ?? TRUSTED.webContentsId, getURL: () => senderUrl },
    senderFrame: {
      isMainFrame: overrides.isMainFrame ?? true,
      url: overrides.frameUrl ?? senderUrl,
    },
  }
}

describe("withTrustedIpcSender", () => {
  it("dispatches only the registered main-frame renderer at its exact URL", () => {
    const guarded = guardedHandler()

    expect(guarded.invoke(event())).toEqual({ ok: true, data: "dispatched" })
    expect(guarded.listener).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["a different WebContents", event({ senderId: 8 })],
    ["a subframe", event({ isMainFrame: false })],
    ["a URL different from the registered document", event({ senderUrl: "http://localhost:5174/" })],
    ["a frame URL different from its sender", event({ frameUrl: "https://example.test/" })],
    ["a missing event", undefined],
  ])("rejects %s before dispatch", (_label, candidate) => {
    const guarded = guardedHandler()

    expect(guarded.invoke(candidate)).toMatchObject({
      ok: false,
      error: { code: "IPC_SENDER_UNAUTHORIZED", retryable: false },
    })
    expect(guarded.listener).not.toHaveBeenCalled()
  })
})
