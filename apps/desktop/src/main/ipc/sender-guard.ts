import { toSerializableError } from "../errors/core"
import { ipcSenderUnauthorizedError } from "../errors/ipc"
import { isSameTrustedDocument } from "./trusted-url"
import type { IpcHandle } from "./types"
import type { IpcMainInvokeEvent } from "electron"

type FrameIdentity = {
  url: string
  processId?: number
  routingId?: number
}

export type IpcSenderEvent = Pick<IpcMainInvokeEvent, "sender" | "senderFrame">

function isMainFrame(frame: FrameIdentity | null | undefined, main: FrameIdentity | null | undefined): boolean {
  if (!frame || !main || !isSameTrustedDocument(frame.url, main.url)) return false
  if (frame === main) return true

  // Electron may expose distinct JS wrappers for the same WebFrameMain in a
  // packaged process. The process/routing pair is the stable frame identity.
  return typeof frame.processId === "number" &&
    typeof frame.routingId === "number" &&
    frame.processId === main.processId &&
    frame.routingId === main.routingId
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
  const frame = candidate.senderFrame as FrameIdentity | null | undefined
  const mainFrame = candidate.sender?.mainFrame as FrameIdentity | null | undefined
  return typeof senderId === "number" &&
    typeof senderUrl === "string" &&
    isMainFrame(frame, mainFrame) &&
    typeof frame?.url === "string" &&
    isSameTrustedDocument(frame.url, senderUrl) &&
    trusted().some((renderer) =>
      renderer.webContentsId === senderId && isSameTrustedDocument(renderer.url, senderUrl),
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
