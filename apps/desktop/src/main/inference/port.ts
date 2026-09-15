import type { ClinicalNote, TranscriptSegment } from "@oira/types"

export type TranscriptionInput = {
  filePath: string
}

export type TranscriptionResult = {
  segments: TranscriptSegment[]
}

export type TranscriptionPort = {
  transcribe: (input: TranscriptionInput) => Promise<TranscriptionResult>
}

/**
 * Optional application-facing lifecycle for a local inference engine.
 * Deliberately contains no SDK concepts (model ids, handles, or load calls).
 */
export type InferenceRuntimePort = {
  warmTranscription: () => Promise<void>
  /**
   * Unloads the transcription model and loads the local structuring model.
   * Callers must wait for this promise before invoking Qwen. A failed Whisper
   * unload must not proceed to Qwen load.
   */
  handoffToStructuring: () => Promise<void>
  shutdown: () => Promise<void>
  /**
   * Completion unificada para Qwen (generador | revisor).
   * role: "generator" | "reviewer"
   * prompt: prompt completo listo para enviar
   * schema: opcional, zod schema para validación de salida estructurada
   */
  completeQwen: (input: { role: "generator" | "reviewer"; prompt: string; schema?: unknown }) => Promise<string>
}

export type StructuringInput = {
  transcript: TranscriptSegment[]
}

/**
 * Issue de validación estricta (Nivel 2). `code` es estable y consumible por
 * el retry loop y por las métricas; ver `structure/generation-errors.ts`.
 */
export type StructuringIssue = {
  code: string
  sectionId?: string
  message: string
}

/**
 * Resultado de la estructuración. `note` nunca es un éxito silencioso: si el
 * modelo agota los reintentos sin producir JSON que pase el contrato estricto,
 * se entrega `draft_unvalidated` con el texto crudo del intento, jamás un
 * borrador inventado presentado como válido.
 */
export type StructuringResult =
  | { kind: "note"; note: ClinicalNote }
  | { kind: "draft_unvalidated"; draftText: string; issues: StructuringIssue[] }

export type StructuringPort = {
  structure: (input: StructuringInput) => Promise<StructuringResult>
}
