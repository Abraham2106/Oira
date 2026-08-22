import { invalidEncounterTransitionError } from "../errors/encounters"
import type { EncounterStatus } from "../../shared/constants/encounter-status"

const ALLOWED: Record<EncounterStatus, readonly EncounterStatus[]> = {
  created: ["recording", "failed", "discarded"],
  recording: ["transcribing", "failed", "discarded"],
  transcribing: ["transcribed", "failed", "discarded"],
  transcribed: ["drafting", "failed", "discarded"],
  drafting: ["drafted", "failed", "discarded"],
  drafted: ["completed", "discarded"],
  completed: [],
  failed: ["discarded"],
  discarded: [],
}

export function canTransition(
  from: EncounterStatus,
  to: EncounterStatus,
): boolean {
  return ALLOWED[from].includes(to)
}

export function assertTransition(
  from: EncounterStatus,
  to: EncounterStatus,
): void {
  if (canTransition(from, to)) return
  throw invalidEncounterTransitionError()
}
