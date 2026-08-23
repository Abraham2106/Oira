import { describe, expect, it } from "vitest"
import {
  meetsQvacNodeFloor,
  parseEmbeddedRuntime,
  parseSemverTriple,
  runtimeLogMeta,
} from "./runtime"

describe("runtime", () => {
  it("parses process.versions triples", () => {
    expect(parseSemverTriple("22.16.0")).toEqual({
      major: 22,
      minor: 16,
      patch: 0,
    })
    expect(parseSemverTriple("38.8.6")).toEqual({
      major: 38,
      minor: 8,
      patch: 6,
    })
    expect(parseSemverTriple("not-a-version")).toBeNull()
  })

  it("rejects Electron 37's embedded Node 22.16 for the QVAC floor", () => {
    expect(meetsQvacNodeFloor({ major: 22, minor: 16, patch: 0 })).toBe(false)
    expect(meetsQvacNodeFloor({ major: 22, minor: 17, patch: 0 })).toBe(true)
    expect(meetsQvacNodeFloor({ major: 22, minor: 18, patch: 0 })).toBe(true)
    expect(meetsQvacNodeFloor({ major: 24, minor: 15, patch: 0 })).toBe(true)
    expect(meetsQvacNodeFloor({ major: 20, minor: 19, patch: 0 })).toBe(false)
  })

  it("logs numeric versions so redaction can keep them", () => {
    const runtime = parseEmbeddedRuntime({
      node: "22.18.0",
      electron: "38.8.6",
    })
    expect(runtime).not.toBeNull()
    expect(runtimeLogMeta(runtime!)).toEqual({
      nodeMajor: 22,
      nodeMinor: 18,
      nodePatch: 0,
      electronMajor: 38,
      electronMinor: 8,
      electronPatch: 6,
      qvacNodeOk: true,
    })
  })
})
