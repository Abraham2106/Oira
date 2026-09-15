import type { AiEngineState } from "@oira/types"
import type { QwenLifecycleState, WhisperLifecycleState } from "../../shared/types/model-lifecycle"

const WHISPER_BUSY = new Set<WhisperLifecycleState>(["LOADING", "TRANSCRIBING", "UNLOADING"])
const QWEN_BUSY = new Set<QwenLifecycleState>(["LOADING", "STRUCTURING", "UNLOADING"])

export function aiEngineStateFromModels(
  whisper: WhisperLifecycleState,
  qwen: QwenLifecycleState,
): AiEngineState {
  if (whisper === "FAILED" || qwen === "FAILED") return "MODEL_NOT_READY"
  if (WHISPER_BUSY.has(whisper) || QWEN_BUSY.has(qwen)) return "MODEL_LOADING"
  return "LOCAL_INFERENCE_READY"
}

export function isWhisperBusy(state: WhisperLifecycleState): boolean {
  return WHISPER_BUSY.has(state)
}

export function isQwenBusy(state: QwenLifecycleState): boolean {
  return QWEN_BUSY.has(state)
}
