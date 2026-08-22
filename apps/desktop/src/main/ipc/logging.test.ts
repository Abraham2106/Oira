import { describe, expect, it } from "vitest"
import { IPC_CHANNELS } from "../../shared/constants/ipc-channels"
import { createLogger } from "../logging"
import { createIpcLogger, createStubIpcDeps, registerIpc } from "./index"
import type { IpcHandle } from "./types"

const SENTINEL = "XYZZY-CANARY-42"

function createHarness() {
  const lines: string[] = []
  const logger = createIpcLogger(createLogger({ sink: (l) => lines.push(l) }))
  const handlers = new Map<string, (event: unknown, raw: unknown) => unknown>()
  const handle: IpcHandle = (channel, listener) => {
    handlers.set(channel, listener)
  }
  registerIpc(handle, createStubIpcDeps(logger))
  return {
    lines,
    invoke: (channel: string, raw?: unknown) =>
      Promise.resolve(handlers.get(channel)?.(undefined, raw)),
  }
}

describe("ipc logging", () => {
  it("logs one scalar-only entry per call", async () => {
    const harness = createHarness()
    await harness.invoke(IPC_CHANNELS.START_ENCOUNTER, {})

    expect(harness.lines).toHaveLength(1)
    const entry = JSON.parse(harness.lines[0]) as Record<string, unknown>
    expect(entry.action).toBe(`ipc.${IPC_CHANNELS.START_ENCOUNTER}`)
    expect(entry.status).toBe("ok")
    expect(typeof entry.latencyMs).toBe("number")
    expect(Object.keys(entry).sort()).toEqual([
      "action",
      "latencyMs",
      "status",
      "ts",
    ])
  })

  it("never logs the rejected payload, only the error code", async () => {
    const harness = createHarness()
    await harness.invoke(IPC_CHANNELS.SAVE_NOTE, {
      encounterId: "not-a-uuid",
      body: `el paciente refiere ${SENTINEL}`,
    })

    expect(harness.lines.join("\n")).not.toContain(SENTINEL)
    const entry = JSON.parse(harness.lines[0]) as Record<string, unknown>
    expect(entry).toMatchObject({ status: "error", errorCode: "INVALID_INPUT" })
  })

  it("logs the typed code when a service refuses the work", async () => {
    const harness = createHarness()
    const started = (await harness.invoke(IPC_CHANNELS.START_ENCOUNTER, {})) as {
      data: { encounterId: string }
    }
    await harness.invoke(IPC_CHANNELS.EXPORT_NOTE, {
      encounterId: started.data.encounterId,
      format: "txt",
    })

    const last = JSON.parse(harness.lines.at(-1) as string) as Record<
      string,
      unknown
    >
    expect(last).toMatchObject({
      status: "error",
      errorCode: "NOT_IMPLEMENTED",
    })
  })
})
