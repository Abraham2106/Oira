import path from "node:path"
import { createAppError } from "./app-error"

export function safeJoin(baseDir: string, ...parts: string[]): string {
  const base = path.resolve(baseDir)
  const target = path.resolve(base, ...parts)
  const prefix = base.endsWith(path.sep) ? base : `${base}${path.sep}`
  if (target !== base && !target.startsWith(prefix)) {
    throw createAppError(
      "PATH_TRAVERSAL_BLOCKED",
      "That path is not allowed.",
      { retryable: false },
    )
  }
  return target
}
