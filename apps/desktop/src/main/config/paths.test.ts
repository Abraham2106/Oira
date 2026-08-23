import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { resolveAppDirectories } from "./paths"

describe("resolveAppDirectories", () => {
  it("scopes audio temp to this process so two instances do not share a dir", () => {
    const userData = join("data", "user")
    const dirs = resolveAppDirectories(userData, join("tmp"))
    expect(dirs.audioTempDir).toBe(join(userData, `tmp-audio-${process.pid}`))
  })
})
