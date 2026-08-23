import { mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { safeJoin } from "../../main/utils/safe-join"
import { isAppError } from "../../main/utils/app-error"

describe("safeJoin", () => {
  const base = mkdtempSync(join(tmpdir(), "notalocal-safe-"))

  it("blocks parent and absolute traversal", () => {
    expect(() => safeJoin(base, "..", "etc", "passwd")).toThrow()
    expect(() => safeJoin(base, "/etc/passwd")).toThrow()
    try {
      safeJoin(base, "..", "windows")
    } catch (error) {
      expect(isAppError(error) && error.code === "PATH_TRAVERSAL_BLOCKED").toBe(true)
    }
  })

  it("allows a child path", () => {
    mkdirSync(join(base, "ok"), { recursive: true })
    expect(safeJoin(base, "ok")).toBe(join(base, "ok"))
  })
})
