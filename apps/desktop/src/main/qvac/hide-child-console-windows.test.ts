import { describe, expect, it, vi } from "vitest"
import { hideChildConsoleWindows } from "./hide-child-console-windows"
import type * as childProcess from "node:child_process"

describe("hideChildConsoleWindows", () => {
  it("forces windowsHide on spawn", () => {
    const spawn = vi.fn()
    const target = { spawn, spawnSync: vi.fn(), execFile: vi.fn(), fork: vi.fn() } as unknown as typeof childProcess
    hideChildConsoleWindows(target, "win32")
    target.spawn("bare.exe", ["worker.mjs"], { stdio: "ignore" })
    expect(spawn).toHaveBeenCalledWith("bare.exe", ["worker.mjs"], expect.objectContaining({
      stdio: "ignore",
      windowsHide: true,
    }))
  })

  it("does not patch outside Windows", () => {
    const spawn = vi.fn()
    const target = { spawn, spawnSync: vi.fn(), execFile: vi.fn(), fork: vi.fn() } as unknown as typeof childProcess
    hideChildConsoleWindows(target, "linux")
    expect(target.spawn).toBe(spawn)
  })

  it("does not throw when patching the live child_process module", () => {
    expect(() => hideChildConsoleWindows(undefined, "win32")).not.toThrow()
  })

  it("does not try to redefine a read-only ESM namespace export", () => {
    const target = Object.freeze({
      spawn: vi.fn(),
      spawnSync: vi.fn(),
      execFile: vi.fn(),
      fork: vi.fn(),
    }) as unknown as typeof childProcess

    expect(() => hideChildConsoleWindows(target, "win32")).not.toThrow()
  })
})
