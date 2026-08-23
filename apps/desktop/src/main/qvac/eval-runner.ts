import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SECTION_IDS, type ClinicalNote } from "@notalocal/types"
import {
  EVAL_CASES,
  caseScript,
  noteMatchesExpected,
  presenceMatrix,
  type EvalCase,
} from "./eval-cases"
import { QWEN_GENERATION_PARAMS } from "./generation"
import { PROMPT_VERSION } from "./prompts"

export type EvalCaseScore = {
  id: string
  pass: boolean
  presenceHits: number
  presenceTotal: number
}

export type EvalRunSummary = {
  run_id: string
  prompt_version: string
  generation_params: typeof QWEN_GENERATION_PARAMS
  mode: "offline-gold"
  cases_run: number
  json_validity: number
  presence_accuracy: number
  cases: EvalCaseScore[]
}

export function scoreNote(evalCase: EvalCase, note: ClinicalNote): EvalCaseScore {
  let presenceHits = 0
  for (const id of SECTION_IDS) {
    if (note.sections[id].presence === evalCase.expected[id].presence) {
      presenceHits += 1
    }
  }
  return {
    id: evalCase.id,
    pass: noteMatchesExpected(note, evalCase.expected),
    presenceHits,
    presenceTotal: SECTION_IDS.length,
  }
}

/** Self-check: gold notes vs expected. Does not load Whisper or Qwen. */
export function scoreGoldFixtures(): EvalRunSummary {
  const cases = EVAL_CASES.map((evalCase) => scoreNote(evalCase, evalCase.goldNote))
  const presenceHits = cases.reduce((sum, row) => sum + row.presenceHits, 0)
  const presenceTotal = cases.reduce((sum, row) => sum + row.presenceTotal, 0)
  return {
    run_id: new Date().toISOString().replaceAll(":", "-"),
    prompt_version: PROMPT_VERSION,
    generation_params: QWEN_GENERATION_PARAMS,
    mode: "offline-gold",
    cases_run: cases.length,
    json_validity: 1,
    presence_accuracy: presenceTotal === 0 ? 0 : presenceHits / presenceTotal,
    cases,
  }
}

export function fixturePaths(evalDir: string, evalCase: EvalCase) {
  return {
    script: join(evalDir, "transcripts", `case-${evalCase.id}.script.txt`),
    gold: join(evalDir, "ground-truth", `case-${evalCase.id}.json`),
    audio: join(evalDir, "audio", `case-${evalCase.id}.wav`),
  }
}

export function writeEvalFixtures(evalDir: string): string[] {
  const written: string[] = []
  for (const evalCase of EVAL_CASES) {
    const paths = fixturePaths(evalDir, evalCase)
    mkdirSync(dirname(paths.script), { recursive: true })
    mkdirSync(dirname(paths.gold), { recursive: true })
    mkdirSync(dirname(paths.audio), { recursive: true })
    writeFileSync(paths.script, `${caseScript(evalCase)}\n`, "utf8")
    writeFileSync(
      paths.gold,
      `${JSON.stringify(
        {
          case_id: evalCase.id,
          skipSyntheticAudio: evalCase.skipSyntheticAudio === true,
          expected: presenceMatrix(evalCase.goldNote),
          note: evalCase.goldNote,
        },
        null,
        2,
      )}\n`,
      "utf8",
    )
    written.push(evalCase.id)
  }
  return written
}

export function desktopEvalDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "eval")
}

export function writeOfflineEval(evalDir: string): EvalRunSummary {
  const summary = scoreGoldFixtures()
  const outDir = join(evalDir, "results", "offline-gold")
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, "run.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8")
  writeFileSync(join(outDir, "summary.md"), formatSummaryMarkdown(summary), "utf8")
  return summary
}

export function formatSummaryMarkdown(summary: EvalRunSummary): string {
  const rows = summary.cases
    .map((row) => `| ${row.id} | ${row.pass ? "pass" : "fail"} | ${row.presenceHits}/${row.presenceTotal} |`)
    .join("\n")
  return `# Eval ${summary.run_id}

mode: \`${summary.mode}\` (no STT/LLM)
prompt_version: ${summary.prompt_version}
predict: ${summary.generation_params.predict}
cases_run: ${summary.cases_run}
json_validity: ${summary.json_validity}
presence_accuracy: ${summary.presence_accuracy.toFixed(3)}

| case | gold vs expected | presence |
| --- | --- | --- |
${rows}

09-noisy has no TTS WAV (skipSyntheticAudio). Live STT+LLM is sequential and not this command.
`
}
