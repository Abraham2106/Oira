/**
 * Write eval scripts/gold, and optionally TTS WAVs.
 * TTS: `$env:EVAL_TTS=1; pnpm --filter notalocal-desktop exec vitest run src/main/qvac/eval-runner.test.ts -t synthesizes`
 * Case 09 is skipped (background noise cannot be synthesized).
 */
import { spawnSync } from "node:child_process"
import { rmSync, writeFileSync } from "node:fs"
import { EVAL_CASES, caseScript } from "./eval-cases"
import { fixturePaths, writeEvalFixtures } from "./eval-runner"

export function synthesizeWav(wavPath: string, phrase: string): void {
  const scriptPath = `${wavPath}.ps1`
  const escapedWav = wavPath.replaceAll("'", "''")
  const escapedPhrase = phrase.replaceAll("'", "''")
  writeFileSync(
    scriptPath,
    [
      "Add-Type -AssemblyName System.Speech",
      "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      "$synth.Rate = -2",
      "try { $synth.SelectVoice('Microsoft Sabina Desktop') } catch { $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, (New-Object System.Globalization.CultureInfo 'es-MX')) }",
      `$synth.SetOutputToWaveFile('${escapedWav}')`,
      `$synth.Speak('${escapedPhrase}')`,
      "$synth.Dispose()",
    ].join("\r\n"),
    { encoding: "utf8" },
  )
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
    { encoding: "utf8" },
  )
  rmSync(scriptPath, { force: true })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "TTS_FAILED")
  }
}

export function prepareEvalFixtures(
  evalDir: string,
  options: { tts: boolean } = { tts: false },
): { written: string[]; wavs: string[]; skippedAudio: string[] } {
  const written = writeEvalFixtures(evalDir)
  const wavs: string[] = []
  const skippedAudio: string[] = []
  if (!options.tts) {
    return { written, wavs, skippedAudio: EVAL_CASES.filter((c) => c.skipSyntheticAudio).map((c) => c.id) }
  }
  for (const evalCase of EVAL_CASES) {
    const audio = fixturePaths(evalDir, evalCase).audio
    if (evalCase.skipSyntheticAudio) {
      skippedAudio.push(evalCase.id)
      process.stderr.write(`qvac.eval skip TTS ${evalCase.id} (noise cannot be synthesized)\n`)
      continue
    }
    process.stderr.write(`qvac.eval TTS ${evalCase.id}\n`)
    synthesizeWav(audio, caseScript(evalCase))
    wavs.push(evalCase.id)
  }
  return { written, wavs, skippedAudio }
}
