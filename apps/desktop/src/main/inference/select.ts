import type { InferenceAdapterName } from "../config/env"
import { createMockStructuring, createMockTranscription } from "./mock"
import type { InferenceRuntimePort, StructuringPort, TranscriptionPort } from "./port"
import { createQvacTranscription } from "../qvac/transcription"
import { createQvacInferenceRuntime } from "../qvac/inference-runtime"
import { createQwenStructuring } from "../qvac/qwen-structuring"
import type { ModelLifecycleEvent } from "../../shared/types/model-lifecycle"

export type { InferenceAdapterName }

export function createInferencePorts(
  adapter: InferenceAdapterName,
  options: {
    onModelLifecycle?: (event: ModelLifecycleEvent) => void
    modelPaths?: { whisper?: string; qwen?: string }
  } = {},
): {
  transcription: TranscriptionPort
  structuring: StructuringPort
  runtime?: InferenceRuntimePort
} {
  if (adapter === "qvac") {
    const runtime = createQvacInferenceRuntime(options)
    return {
      transcription: createQvacTranscription({ runtime }),
      structuring: createQwenStructuring({ runtime }),
      runtime,
    }
  }
  return {
    transcription: createMockTranscription(),
    structuring: createMockStructuring(),
  }
}
