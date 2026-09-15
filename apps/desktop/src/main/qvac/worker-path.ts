import { existsSync } from "node:fs"
import { join } from "node:path"

export function resolveQvacWorkerPath(input: {
  resourcesPath?: string
  appPath?: string
  existingEnv?: NodeJS.ProcessEnv
}): string | undefined {
  if (input.existingEnv?.QVAC_WORKER_PATH) return input.existingEnv.QVAC_WORKER_PATH
  const candidates = [
    input.resourcesPath && join(input.resourcesPath, "app.asar.unpacked", "qvac", "worker.entry.mjs"),
    input.resourcesPath && join(input.resourcesPath, "app", "qvac", "worker.entry.mjs"),
    input.resourcesPath && join(input.resourcesPath, "qvac", "worker.entry.mjs"),
    input.appPath?.replace(/\.asar([\\/]|$)/, ".asar.unpacked$1") && join(input.appPath.replace(/\.asar([\\/]|$)/, ".asar.unpacked$1"), "qvac", "worker.entry.mjs"),
    input.appPath && join(input.appPath, "qvac", "worker.entry.mjs"),
    input.appPath && join(input.appPath, "..", "qvac", "worker.entry.mjs"),
    join(process.cwd(), "qvac", "worker.entry.mjs"),
    join(process.cwd(), "apps", "desktop", "qvac", "worker.entry.mjs"),
  ].filter((value): value is string => Boolean(value))
  return candidates.find((candidate) => existsSync(candidate))
}
