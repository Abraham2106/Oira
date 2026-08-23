import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const srcRoot = join(import.meta.dirname, "..", "..")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full)
  }
  return out
}

describe("isolation", () => {
  it("shared never imports node, electron, or qvac", () => {
    const banned = /from ["'](?:node:|electron|@qvac\/sdk)/
    const offenders: string[] = []
    for (const file of walk(join(srcRoot, "shared"))) {
      if (banned.test(readFileSync(file, "utf8"))) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  it("renderer never imports main modules or @qvac/sdk", () => {
    const banned = /from ["'](?:@qvac\/sdk|electron)|from ["']\.\.\/main\//
    const offenders: string[] = []
    for (const file of walk(join(srcRoot, "renderer"))) {
      if (banned.test(readFileSync(file, "utf8"))) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  it("preload has no generic invoke(channel, args)", () => {
    const preload = readFileSync(join(srcRoot, "preload", "index.ts"), "utf8")
    expect(preload).not.toMatch(/invoke\(\s*channel/)
    expect(preload).toContain("exposeInMainWorld(\"notalocal\"")
  })
})
