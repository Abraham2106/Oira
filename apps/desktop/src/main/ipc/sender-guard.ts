import { toSerializableError } from "../errors/core"
import { ipcSenderUnauthorizedError } from "../errors/ipc"
import type { IpcHandle } from "./types"

export type IpcSenderEvent = {
  sender?: { id?: number; getURL?: () => string }
  senderFrame?: { isMainFrame?: boolean; url?: string }
}

export type TrustedRenderer = {
  webContentsId: number
  url: string
}

function isTrustedEvent(event: unknown, trusted: () => readonly TrustedRenderer[]): boolean {
  if (typeof event !== "object" || event === null) return false
  const candidate = event as IpcSenderEvent
  const senderId = candidate.sender?.id
  const senderUrl = candidate.sender?.getURL?.()
  const frame = candidate.senderFrame
  return typeof senderId === "number" &&
    typeof senderUrl === "string" &&
    frame?.isMainFrame === true &&
    frame.url === senderUrl &&
    trusted().some((renderer) =>
      renderer.webContentsId === senderId && renderer.url === senderUrl,
    )
}

/** Common IPC boundary: reject before channel validation, logging or services. */
export function withTrustedIpcSender(
  handle: IpcHandle,
  trusted: () => readonly TrustedRenderer[],
): IpcHandle {
  return (channel, listener) => {
    handle(channel, (event, raw) => {
      if (!isTrustedEvent(event, trusted)) {
        return { ok: false, error: toSerializableError(ipcSenderUnauthorizedError()) }
      }
      return listener(event, raw)
    })
  }
}
