import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import type { StructuringPort, TranscriptionPort } from "./port"

export function createMockTranscription(): TranscriptionPort {
  return {
    async transcribe() {
      return { segments: SYNTHETIC_TRANSCRIPT }
    },
  }
}

export function createMockStructuring(): StructuringPort {
  return {
    async structure() {
      return { note: syntheticClinicalNote() }
    },
  }
}
