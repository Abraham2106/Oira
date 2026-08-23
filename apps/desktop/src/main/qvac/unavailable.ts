import { modelNotReadyError } from "../errors/inference"
import type { StructuringPort, TranscriptionPort } from "../inference/port"

/** Fail closed: no SDK import, no cloud fallback. */
export function createUnavailableQvacPorts(): {
  transcription: TranscriptionPort
  structuring: StructuringPort
} {
  const fail = async () => {
    throw modelNotReadyError()
  }
  return {
    transcription: { transcribe: fail },
    structuring: { structure: fail },
  }
}
