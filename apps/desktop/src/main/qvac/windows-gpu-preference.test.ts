import { describe, expect, it, vi } from "vitest"
import { requestWindowsHighPerformanceGpu, resolveHighPerformanceExecutables } from "./windows-gpu-preference"

describe("requestWindowsHighPerformanceGpu", () => {
  it("writes GpuPreference=2 for each existing executable on Windows", () => {
    const run = vi.fn()
    requestWindowsHighPerformanceGpu(["C:\\app\\Oira.exe", "C:\\app\\bare.exe"], run as never)
    if (process.platform === "win32") {
      expect(run).toHaveBeenCalledTimes(2)
      expect(run).toHaveBeenCalledWith(
        "reg",
        expect.arrayContaining(["GpuPreference=2;", "C:\\app\\Oira.exe"]),
        expect.any(Function),
      )
    } else {
      expect(run).not.toHaveBeenCalled()
    }
  })

  it("only returns paths that exist", () => {
    expect(resolveHighPerformanceExecutables({ execPath: "C:\\missing\\Oira.exe", cwd: "C:\\missing" })).toEqual([])
  })
})
