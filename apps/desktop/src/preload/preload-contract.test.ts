import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))
const read = (relative: string) => readFileSync(join(here, relative), "utf8")

describe("preload wiring", () => {
  /**
   * A sandboxed preload cannot be ESM: with an .mjs preload and sandbox: true
   * Electron skips the script, window.oira never appears, and the
   * renderer falls back to fixtures without saying so.
   */
  it("builds the preload as CJS and loads that exact file", () => {
    expect(read("../../electron.vite.config.ts")).toMatch(
      /entryFileNames:\s*"index\.cjs"/,
    )
    const main = read("../main/index.ts")
    expect(main).toContain("../preload/index.cjs")
    expect(main).not.toContain("../preload/index.mjs")
    expect(main).toContain("sandbox: true")
  })

  it("exposes only the four named methods, never a generic invoke", () => {
    const preload = read("./index.ts")
    for (const method of [
      "startEncounter",
      "stopEncounter",
      "generateNote",
      "saveNote",
    ]) {
      expect(preload).toContain(method)
    }
    expect(preload).not.toMatch(/invoke\(\s*channel/)
    expect(preload).not.toContain("AUTH_UNLOCK")
    expect(preload).not.toContain("EXPORT_NOTE")
  })
})
