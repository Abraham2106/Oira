import path from "node:path"
import { pathTraversalBlockedError } from "../errors/audio"

export function safeJoin(baseDir: string, ...parts: string[]): string {
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, ...parts)
  const relative = path.relative(base, resolved)
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw pathTraversalBlockedError()
  }
  return resolved
}
