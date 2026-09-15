import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import type * as childProcess from "node:child_process"

let patched = false

function withHiddenConsole(options: object | undefined): object {
  return { ...options, windowsHide: true }
}

function cjsChildProcess(): typeof childProcess {
  return createRequire(fileURLToPath(import.meta.url))("child_process") as typeof childProcess
}

function patchFn(
  target: object,
  key: "spawn" | "spawnSync" | "execFile" | "fork",
  value: unknown,
): void {
  try {
    ;(target as Record<string, unknown>)[key] = value
  } catch { /* ESM namespace objects are intentionally immutable. */ }
}

/**
 * Bare.exe and npm `.cmd` shims are console-subsystem binaries. Without this,
 * every SDK worker spawn opens a CMD window over the clinical UI.
 * Must never throw: the ESM `child_process` namespace is read-only.
 */
export function hideChildConsoleWindows(
  target?: typeof childProcess,
  platform: NodeJS.Platform = process.platform,
): void {
  if (platform !== "win32") return
  const resolved = target ?? cjsChildProcess()
  if (!target && patched) return
  try {
    const spawn = resolved.spawn.bind(resolved)
    patchFn(resolved, "spawn", ((command: string, args?: unknown, options?: unknown) => {
      if (Array.isArray(args) || args === undefined) {
        return spawn(command, args ?? [], withHiddenConsole(options as object | undefined) as never)
      }
      return spawn(command, withHiddenConsole(args as object) as never)
    }) as typeof childProcess.spawn)

    const spawnSync = resolved.spawnSync.bind(resolved)
    patchFn(resolved, "spawnSync", ((command: string, args?: unknown, options?: unknown) => {
      if (Array.isArray(args) || args === undefined) {
        return spawnSync(command, args ?? [], withHiddenConsole(options as object | undefined) as never)
      }
      return spawnSync(command, withHiddenConsole(args as object) as never)
    }) as typeof childProcess.spawnSync)

    const execFile = resolved.execFile.bind(resolved)
    patchFn(resolved, "execFile", ((file: string, args?: unknown, options?: unknown, callback?: unknown) => {
      if (typeof args === "function") {
        return execFile(file, [], withHiddenConsole(undefined) as never, args as never)
      }
      if (typeof options === "function") {
        if (Array.isArray(args)) {
          return execFile(file, args, withHiddenConsole(undefined) as never, options as never)
        }
        return execFile(file, withHiddenConsole(args as object) as never, options as never)
      }
      if (Array.isArray(args) || args === undefined) {
        return execFile(file, args ?? [], withHiddenConsole(options as object | undefined) as never, callback as never)
      }
      return execFile(file, withHiddenConsole(args as object) as never, options as never)
    }) as typeof childProcess.execFile)

    const fork = resolved.fork.bind(resolved)
    patchFn(resolved, "fork", ((modulePath: string, args?: unknown, options?: unknown) => {
      if (Array.isArray(args) || args === undefined) {
        return fork(modulePath, args as string[] | undefined, withHiddenConsole(options as object | undefined) as never)
      }
      return fork(modulePath, withHiddenConsole(args as object) as never)
    }) as typeof childProcess.fork)

    if (!target) patched = true
  } catch {
    /* Best-effort: a failed patch must not kill the QVAC gateway. */
  }
}
