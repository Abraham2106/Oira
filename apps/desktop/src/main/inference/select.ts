import type { InferenceAdapterName } from "../config/env"
import { createMockStructuring, createMockTranscription } from "./mock"
import type { StructuringPort, TranscriptionPort } from "./port"
import { createQvacStructuring } from "../qvac/structuring"
import { createQvacTranscription } from "../qvac/transcription"

export type { InferenceAdapterName }

export function createInferencePorts(adapter: InferenceAdapterName): {
  transcription: TranscriptionPort
  structuring: StructuringPort
} {
  if (adapter === "qvac") {
    return {
      transcription: createQvacTranscription(),
      structuring: createQvacStructuring(),
    }
  }
  return {
    transcription: createMockTranscription(),
    structuring: createMockStructuring(),
  }
}
