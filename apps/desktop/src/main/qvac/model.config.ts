/**
 * Logical model roles. Concrete SDK constants belong here only — never in
 * transcription/notes. The IA role chooses the catalog IDs later.
 */
export type ModelRole = "stt" | "structuring"

export type ModelSlot = {
  role: ModelRole
  /** Catalog id once Q2 / IA role pick it. Null means unset. */
  modelSrc: string | null
  modelType: "whisper" | "parakeet" | "llm"
}

export const DEFAULT_MODEL_CONFIG: Record<ModelRole, ModelSlot> = {
  stt: {
    role: "stt",
    modelSrc: null,
    modelType: "whisper",
  },
  structuring: {
    role: "structuring",
    modelSrc: null,
    modelType: "llm",
  },
}
