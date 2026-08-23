import type { InferenceAdapterName } from "../config/env"
import { createTranscriptDraftStructuring } from "./draft"
import { createMockStructuring, createMockTranscription } from "./mock"
import type { StructuringPort, TranscriptionPort } from "./port"
import { createQvacTranscription } from "../qvac/transcription"

export type { InferenceAdapterName }

export function createInferencePorts(adapter: InferenceAdapterName): {
  transcription: TranscriptionPort
  structuring: StructuringPort
} {
  if (adapter === "qvac") {
    return {
      transcription: createQvacTranscription(),
      structuring: createTranscriptDraftStructuring(),
    }
  }
  return {
    transcription: createMockTranscription(),
    structuring: createMockStructuring(),
  }
}
