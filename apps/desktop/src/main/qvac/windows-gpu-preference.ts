import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const KEY = String.raw`HKCU\Software\Microsoft\DirectX\UserGpuPreferences`

export function resolveHighPerformanceExecutables(input: {
  execPath?: string
  resourcesPath?: string
  appPath?: string
  cwd?: string
} = {}): string[] {
  const execPath = input.execPath ?? process.execPath
  const roots = [
    input.appPath,
    input.resourcesPath && join(input.resourcesPath, "app"),
    input.resourcesPath,
    input.cwd ?? process.cwd(),
  ].filter((value): value is string => Boolean(value))
  const candidates = [
    execPath,
    ...roots.flatMap((root) => [
      join(root, "node_modules", "bare-runtime-win32-x64", "bin", "bare.exe"),
      join(root, "node_modules", "bare-runtime", "bin", "bare.exe"),
    ]),
  ]
  return [...new Set(candidates.filter((path) => existsSync(path)))]
}

/** HKCU Graphics preference 2 = High performance (dedicated GPU). Best-effort. */
export function requestWindowsHighPerformanceGpu(
  executables: readonly string[] = resolveHighPerformanceExecutables(),
  run: typeof execFile = execFile,
): void {
  if (process.platform !== "win32") return
  for (const exe of executables) {
    run("reg", ["add", KEY, "/v", exe, "/t", "REG_SZ", "/d", "GpuPreference=2;", "/f"], () => undefined)
  }
}
