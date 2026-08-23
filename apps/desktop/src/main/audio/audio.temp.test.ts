import { mkdirSync, mkdtempSync, readdirSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isAppError } from "../utils/app-error"
import {
  assertEncounterId,
  encounterAudioDir,
  ensureEncounterAudioDir,
} from "./audio.temp"

const ID = "11111111-1111-4111-8111-111111111111"

describe("audio.temp", () => {
  it("rejects an invalid encounter id before touching disk", () => {
    const base = mkdtempSync(join(tmpdir(), "notalocal-audio-id-"))
    expect(() => assertEncounterId("not-a-uuid")).toThrow()
    expect(() => encounterAudioDir(base, "../oops")).toThrow()
    try {
      encounterAudioDir(base, "..\\windows")
    } catch (error) {
      expect(
        isAppError(error) &&
          (error.code === "INVALID_INPUT" || error.code === "PATH_TRAVERSAL_BLOCKED"),
      ).toBe(true)
    }
    expect(readdirSync(base)).toEqual([])
  })

  it("creates the encounter dir under the audio temp root", async () => {
    const base = mkdtempSync(join(tmpdir(), "notalocal-audio-dir-"))
    mkdirSync(base, { recursive: true })
    const dir = await ensureEncounterAudioDir(base, ID)
    expect(dir).toBe(join(base, ID))
    const info = statSync(dir)
    expect(info.isDirectory()).toBe(true)
    if (process.platform !== "win32") {
      expect(info.mode & 0o777).toBe(0o700)
    }
  })
})
