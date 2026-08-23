import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { EVAL_CASES } from "./eval-cases"
import { prepareEvalFixtures } from "./eval-prepare"
import { desktopEvalDir, writeOfflineEval, scoreGoldFixtures } from "./eval-runner"

describe("eval runner", () => {
  it("scores all gold fixtures as a pass (offline, no models)", () => {
    const summary = scoreGoldFixtures()
    expect(summary.cases_run).toBe(13)
    expect(summary.json_validity).toBe(1)
    expect(summary.presence_accuracy).toBe(1)
    expect(summary.generation_params.predict).toBe(2048)
    expect(summary.cases.every((row) => row.pass)).toBe(true)
  })

  it("writes script and ground-truth files without TTS", () => {
    const dir = mkdtempSync(join(tmpdir(), "nl-eval-"))
    try {
      const result = prepareEvalFixtures(dir, { tts: false })
      expect(result.written).toHaveLength(EVAL_CASES.length)
      const first = EVAL_CASES[0]
      if (!first) throw new Error("missing eval cases")
      const script = readFileSync(join(dir, "transcripts", `case-${first.id}.script.txt`), "utf8")
      expect(script.length).toBeGreaterThan(10)
      const gold = JSON.parse(
        readFileSync(join(dir, "ground-truth", `case-${first.id}.json`), "utf8"),
      ) as { case_id: string }
      expect(gold.case_id).toBe(first.id)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("syncs apps/desktop/eval scripts, gold, and offline run.json", () => {
    const evalDir = desktopEvalDir()
    const prepared = prepareEvalFixtures(evalDir, { tts: false })
    expect(prepared.written).toHaveLength(13)
    const summary = writeOfflineEval(evalDir)
    expect(summary.cases.every((row) => row.pass)).toBe(true)
    expect(existsSync(join(evalDir, "results", "offline-gold", "summary.md"))).toBe(true)
    expect(existsSync(join(evalDir, "transcripts", "case-10-longer.script.txt"))).toBe(true)
    expect(existsSync(join(evalDir, "audio", "case-09-noisy.wav"))).toBe(false)
  })

  it.skipIf(process.env.EVAL_TTS !== "1")(
    "synthesizes case WAVs except 09-noisy",
    () => {
      const result = prepareEvalFixtures(desktopEvalDir(), { tts: true })
      expect(result.skippedAudio).toEqual(["09-noisy"])
      expect(result.wavs).toHaveLength(12)
      expect(existsSync(join(desktopEvalDir(), "audio", "case-01-simple.wav"))).toBe(true)
      expect(existsSync(join(desktopEvalDir(), "audio", "case-10-longer.wav"))).toBe(true)
      expect(existsSync(join(desktopEvalDir(), "audio", "case-09-noisy.wav"))).toBe(false)
    },
    180_000,
  )
})
