import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { tmpdir } from "node:os"
import { describe, expect, it } from "vitest"
import { resolveBundledMainScript } from "./bundled-main-script"

describe("resolveBundledMainScript", () => {
  it("finds the sibling file next to the importer", () => {
    const dir = join(tmpdir(), `oira-main-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "gateway.js"), "")
    writeFileSync(join(dir, "importer.js"), "")
    expect(resolveBundledMainScript("gateway.js", pathToFileURL(join(dir, "importer.js")).href)).toBe(
      join(dir, "gateway.js"),
    )
  })

  it("walks up from a chunks directory", () => {
    const root = join(tmpdir(), `oira-chunks-${Date.now()}`)
    const chunks = join(root, "chunks")
    mkdirSync(chunks, { recursive: true })
    writeFileSync(join(root, "gpu-probe.js"), "")
    writeFileSync(join(chunks, "importer.js"), "")
    expect(resolveBundledMainScript("gpu-probe.js", pathToFileURL(join(chunks, "importer.js")).href)).toBe(
      join(root, "gpu-probe.js"),
    )
  })
})
