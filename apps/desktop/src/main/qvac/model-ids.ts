/**
 * P0 catalog ids only — string names, no SDK import.
 * Disk sizes from the 0.17.1 registry snapshot in docs/AI_QVAC_TRANSCRIPTION_GUIDE.md §3.2.
 * 1.7B Q4 (~1.06 GB disk) is the quality step up from 600M that still fits sequential load.
 * Never load 4B / Whisper large / Parakeet — those thrash a 16 GB Windows box with Cursor open.
 * STT is multilingual small with language: "es" (no Spanish-finetuned small exists).
 */
export const P0_STT_MODEL_ID = "WHISPER_SMALL_Q8_0"
export const P0_LLM_MODEL_ID = "QWEN3_1_7B_INST_Q4"

export const P0_SMOKE_MODEL_ID = "WHISPER_SMALL_Q8_0"

export const HEAVY_MODEL_IDS = [
  "QWEN3_4B_Q4_K_M",
  "QWEN3_4B_INST_Q4_K_M",
  "WHISPER_LARGE_V3_TURBO",
  "PARAKEET_TDT_0_6B_V3_Q8_0",
] as const
