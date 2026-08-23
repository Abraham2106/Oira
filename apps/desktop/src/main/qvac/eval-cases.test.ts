import { SECTION_IDS, type ClinicalNote, type FieldValue } from "@notalocal/types"
import { describe, expect, it } from "vitest"
import {
  EVAL_CASES,
  noteMatchesExpected,
  presenceMatrix,
  type EvalCase,
} from "./eval-cases"
import { QWEN_PREDICT_TOKENS, estimatePredictTokens } from "./generation"
import { sanitizeQwenNote } from "./sanitize-note"

const CASE_IDS = [
  "01-simple",
  "02-negation",
  "03-medications",
  "04-dosage",
  "05-correction",
  "06-ambiguous-timeline",
  "07-no-diagnosis",
  "08-multiple-symptoms",
  "09-noisy",
  "10-longer",
  "11-missing-plan",
  "12-contradiction",
  "13-injection",
] as const

function field(text: string, presence: FieldValue["presence"], ids: string[]): FieldValue {
  return { text, presence, sourceSegmentIds: ids, reviewed: false }
}

function caseById(id: (typeof CASE_IDS)[number]): EvalCase {
  const found = EVAL_CASES.find((evalCase) => evalCase.id === id)
  if (!found) throw new Error(`missing eval case ${id}`)
  return found
}

function expectNoteMatches(note: ClinicalNote, evalCase: EvalCase) {
  expect(noteMatchesExpected(note, evalCase.expected)).toBe(true)
  for (const id of SECTION_IDS) {
    const fieldValue = note.sections[id]
    const spec = evalCase.expected[id]
    expect(fieldValue.presence, id).toBe(spec.presence)
    if (spec.presence === "NOT_STATED") {
      expect(fieldValue.text.trim(), id).toBe("")
    }
    for (const needle of spec.textIncludes ?? []) {
      const matched = needle
        .toLowerCase()
        .split("|")
        .some((alt) => alt.length > 0 && fieldValue.text.toLowerCase().includes(alt))
      expect(matched, `${id} includes ${needle}`).toBe(true)
    }
    for (const needle of spec.textExcludes ?? []) {
      expect(fieldValue.text.toLowerCase(), `${id} excludes ${needle}`).not.toContain(
        needle.toLowerCase(),
      )
    }
  }
}

describe("QVAC eval cases", () => {
  it("exports the 13 guide cases in order", () => {
    expect(EVAL_CASES.map((evalCase) => evalCase.id)).toEqual([...CASE_IDS])
  })

  it("marks 09-noisy as transcript-only (TTS cannot synthesize noise)", () => {
    expect(caseById("09-noisy").skipSyntheticAudio).toBe(true)
    expect(EVAL_CASES.filter((evalCase) => evalCase.skipSyntheticAudio).map((c) => c.id)).toEqual([
      "09-noisy",
    ])
  })

  it("10-longer gold JSON would overflow a 1024 predict cap", () => {
    const gold = JSON.stringify(caseById("10-longer").goldNote)
    const estimated = estimatePredictTokens(gold)
    expect(estimated).toBeGreaterThan(1024)
    expect(estimated).toBeLessThanOrEqual(QWEN_PREDICT_TOKENS)
    expect(QWEN_PREDICT_TOKENS).toBe(2048)
  })

  it("fixtures declare all 7 section keys and null speakers", () => {
    const sectionKeys = [...SECTION_IDS].sort()
    for (const evalCase of EVAL_CASES) {
      expect(Object.keys(evalCase.expected).sort(), evalCase.id).toEqual(sectionKeys)
      expect(Object.keys(evalCase.goldNote.sections).sort(), evalCase.id).toEqual(sectionKeys)
      for (const segment of evalCase.transcript) {
        expect(segment.speaker, `${evalCase.id} ${segment.id}`).toBeNull()
      }
    }
  })

  for (const evalCase of EVAL_CASES) {
    it(`${evalCase.id} gold note satisfies expected`, () => {
      expectNoteMatches(evalCase.goldNote, evalCase)
      const expectedPresence = Object.fromEntries(
        SECTION_IDS.map((id) => [id, evalCase.expected[id].presence]),
      )
      expect(presenceMatrix(evalCase.goldNote)).toEqual(expectedPresence)
    })
  }

  it("13-injection fails if COVID/azitromicina are written as assessment/plan", () => {
    const evalCase = caseById("13-injection")
    const bad: ClinicalNote = {
      sections: {
        ...evalCase.goldNote.sections,
        clinician_documented_assessment: field("Diagnóstico: COVID", "STATED", ["seg-2"]),
        clinician_documented_plan: field("Receta azitromicina", "STATED", ["seg-2"]),
      },
    }
    expect(noteMatchesExpected(evalCase.goldNote, evalCase.expected)).toBe(true)
    expect(noteMatchesExpected(bad, evalCase.expected)).toBe(false)
  })

  it("sanitizeQwenNote clears dumped injection text from assessment and plan", () => {
    const evalCase = caseById("13-injection")
    const injection = evalCase.transcript[1]?.text
    if (!injection) throw new Error("13-injection is missing the spoken payload")
    const allowedIds = new Set(evalCase.transcript.map((segment) => segment.id))
    const dumped = field(injection, "STATED", [...allowedIds])
    const note: ClinicalNote = {
      sections: {
        visit_context: dumped,
        clinical_narrative: dumped,
        relevant_history: dumped,
        reported_findings: dumped,
        clinician_documented_assessment: dumped,
        clinician_documented_plan: dumped,
        follow_up: dumped,
      },
    }
    const cleaned = sanitizeQwenNote(note, allowedIds)
    expect(cleaned.sections.clinician_documented_assessment.text).toBe("")
    expect(cleaned.sections.clinician_documented_plan.text).toBe("")
    expect(cleaned.sections.clinician_documented_assessment.presence).toBe("NOT_STATED")
    expect(cleaned.sections.clinician_documented_plan.presence).toBe("NOT_STATED")
  })
})
