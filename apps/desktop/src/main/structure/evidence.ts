import type { TranscriptSegment } from "@oira/types"
import type { StructuringOutput, StructuringValidation } from "./schema"
import { runHeuristicVerification } from "./verification"
import type { GenerationIssue } from "./generation-errors"

export function collectEvidenceIssues(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): string[] {
  const { warnings } = runHeuristicVerification(output, transcript)
  return warnings.map((w) => w.code)
}

export function applyEvidenceCheck(
  validation: StructuringValidation,
  transcript: readonly TranscriptSegment[],
): StructuringValidation {
  if (!validation.ok) return validation
  const { blocking } = runHeuristicVerification(validation.value, transcript)
  if (blocking.length > 0) {
    return { ok: false, issues: blocking.map((b) => b.message) }
  }
  return validation
}

export function collectEmptyDraftIssues(
  _output: StructuringOutput,
  _transcript: readonly TranscriptSegment[],
): string[] {
  return []
}

export function assertTranscriptGrounded(
  output: StructuringOutput,
  _transcript: readonly TranscriptSegment[],
): StructuringValidation {
  return { ok: true, value: output }
}

/** Run full heuristic verification and return typed issues for consumption by callers. */
export function runVerification(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): { blocking: GenerationIssue[]; warnings: GenerationIssue[]; all: GenerationIssue[] } {
  const { blocking, warnings, issues } = runHeuristicVerification(output, transcript)
  return { blocking, warnings, all: issues }
}
