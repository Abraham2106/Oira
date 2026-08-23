import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(here, "..")
const desktopRoot = join(srcRoot, "..")
const SDK = "@qvac/sdk"

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, files)
    else files.push(path)
  }
  return files
}

describe("Q02 qvac pin", () => {
  it("pins @qvac/sdk to 0.17.1 with no caret", () => {
    const pkg = JSON.parse(
      readFileSync(join(desktopRoot, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> }
    expect(pkg.dependencies?.[SDK]).toBe("0.17.1")
  })

  it("imports @qvac/sdk only under src/main/qvac", () => {
    const hits: string[] = []
    for (const file of walk(srcRoot)) {
      if (!/\.(ts|tsx)$/.test(file)) continue
      if (/\.test\.tsx?$/.test(file)) continue
      if (readFileSync(file, "utf8").includes(SDK)) {
        hits.push(file.slice(srcRoot.length + 1).replaceAll("\\", "/"))
      }
    }
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((path) => path.startsWith("main/qvac/"))).toBe(true)
  })
})
