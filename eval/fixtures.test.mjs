import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { SECTION_IDS } from "./scorer/index.mjs"

const root = dirname(fileURLToPath(import.meta.url))

describe("frozen I4 fixtures", () => {
  const manifest = JSON.parse(readFileSync(join(root, "fixtures/cases.json"), "utf8"))

  it("declares the 19 frozen evaluation cases", () => {
    assert.equal(manifest.cases.length, 19)
    assert.equal(manifest.frozen, true)
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
