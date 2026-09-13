import assert from "node:assert/strict"
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { SECTION_IDS } from "./scorer/index.mjs"
import { appendHistory, historyEntry, isHistoryEntry } from "./history.mjs"

const root = dirname(fileURLToPath(import.meta.url))

describe("frozen I4 fixtures", () => {
  const manifest = JSON.parse(readFileSync(join(root, "fixtures/cases.json"), "utf8"))

  it("declares the 19 frozen evaluation cases", () => {
    assert.equal(manifest.cases.length, 19)
    assert.equal(manifest.frozen, true)
  })

  it("keeps parseable history entries and appends without rewriting previous lines", () => {
    const historyPath = join(root, "history.jsonl")
    const priorLines = readFileSync(historyPath, "utf8").trim().split("\n")
    assert.equal(priorLines.length, 7)
    for (const line of priorLines) assert.ok(isHistoryEntry(JSON.parse(line)))

    const dir = mkdtempSync(join(tmpdir(), "oira-eval-history-"))
    const tempHistory = join(dir, "history.jsonl")
    try {
      appendFileSync(tempHistory, `${priorLines[0]}\n`, "utf8")
      const entry = historyEntry(
        { startedAt: "2026-09-14T00:00:00.000Z", gitCommit: null, adapter: "heuristic", layer: "A-skip-stt" },
        { stt: { meanWer: null, meanCer: null }, presence: { accuracy: 1, macroF1: 1 }, invention: { rate: 0 }, latency: { p50: 1 }, cases: 1, errors: 0 },
      )
      appendHistory(tempHistory, entry)
      const lines = readFileSync(tempHistory, "utf8").trim().split("\n")
      assert.equal(lines.length, 2)
      assert.equal(lines[0], priorLines[0])
      assert.deepEqual(JSON.parse(lines[1]), entry)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  for (const item of manifest.cases) {
    it(`${item.id} has script, transcript, and complete I4 gold`, () => {
      const dir = join(root, "fixtures", item.id)
      const script = readFileSync(join(dir, "script.txt"), "utf8")
      const transcript = JSON.parse(readFileSync(join(dir, "transcript.json"), "utf8"))
      const gold = JSON.parse(readFileSync(join(dir, "gold.json"), "utf8"))
      assert.ok(script.trim())
      assert.ok(Array.isArray(transcript) && transcript.length > 0)
      assert.equal(gold.id, item.id)
      assert.equal(gold.category, item.category)
      assert.ok(Array.isArray(gold.must_not_contain))
      for (const sectionId of SECTION_IDS) {
        const section = gold.sections[sectionId]
        assert.ok(section, `${item.id} missing ${sectionId}`)
        assert.ok(["STATED", "NOT_STATED", "UNKNOWN"].includes(section.presence))
        assert.ok(Array.isArray(section.mustInclude))
      }
      for (const segment of transcript) {
        assert.ok(segment.id)
        assert.equal(typeof segment.text, "string")
      }
    })
  }
})
