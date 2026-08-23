/**
 * llama.cpp `predict` cap for the 7-section clinical JSON.
 * 1024 is tight for case 10 (~4 min, all sections STATED). notes.service
 * retries INVALID_STRUCTURED_OUTPUT with the same cap, so a truncated
 * completion would fail twice.
 */
export const QWEN_PREDICT_TOKENS = 2048

/** Conservative Spanish+JSON: ~2 chars/token (overestimates vs ~3–4). */
export function estimatePredictTokens(text: string): number {
  return Math.ceil(text.length / 2)
}

export const QWEN_GENERATION_PARAMS = {
  temp: 0,
  seed: 42,
  predict: QWEN_PREDICT_TOKENS,
  reasoning_budget: 0,
} as const
