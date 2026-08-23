/**
 * P0 catalog ids only — string names, no SDK import.
 * Disk sizes from the 0.17.1 registry snapshot in docs/AI_QVAC_TRANSCRIPTION_GUIDE.md §3.2.
 * Default LLM is 1.7B Q4 (~1.06 GB disk). QWEN3_4B_INST_Q4_K_M (~2.50 GB) is
 * opt-in via NOTALOCAL_LLM; measure tokensPerSecond before promoting it.
 * Never default-load 4B / Whisper large / Parakeet.
 * STT is multilingual small with language: "es" (no Spanish-finetuned small exists).
 */
export const P0_STT_MODEL_ID = "WHISPER_SMALL_Q8_0"
export const P0_LLM_MODEL_ID = "QWEN3_1_7B_INST_Q4"
export const OPTIONAL_LLM_MODEL_ID = "QWEN3_4B_INST_Q4_K_M"

export const P0_SMOKE_MODEL_ID = "WHISPER_SMALL_Q8_0"

export const LLM_MODEL_IDS = [P0_LLM_MODEL_ID, OPTIONAL_LLM_MODEL_ID] as const
export type LlmModelId = (typeof LLM_MODEL_IDS)[number]

export const HEAVY_MODEL_IDS = [
  "QWEN3_4B_Q4_K_M",
  "QWEN3_4B_INST_Q4_K_M",
  "WHISPER_LARGE_V3_TURBO",
  "PARAKEET_TDT_0_6B_V3_Q8_0",
] as const

/** Default 1.7B. `NOTALOCAL_LLM=QWEN3_4B_INST_Q4_K_M` selects the 4B instruct. */
export function resolveLlmModelId(
  value: string | undefined = process.env.NOTALOCAL_LLM,
): LlmModelId {
  const requested = value?.trim()
  if (!requested || requested === P0_LLM_MODEL_ID) return P0_LLM_MODEL_ID
  if (requested === OPTIONAL_LLM_MODEL_ID) return OPTIONAL_LLM_MODEL_ID
  throw new Error("UNKNOWN_LLM")
}
