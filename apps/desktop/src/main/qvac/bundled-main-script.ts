import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export type BundledMainScript = "gateway.js" | "gpu-probe.js"

/** electron-vite may leave this module in `dist/main` or `dist/main/chunks`. */
export function resolveBundledMainScript(
  filename: BundledMainScript,
  fromUrl: string = import.meta.url,
): string {
  const start = dirname(fileURLToPath(fromUrl))
  const candidates = [join(start, filename), join(start, "..", filename)]
  return candidates.find((path) => existsSync(path)) ?? candidates[0]
}
