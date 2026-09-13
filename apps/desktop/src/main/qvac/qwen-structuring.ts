import type { StructuringPort } from "../inference/port"
import { invalidStructuredOutputError } from "../errors/notes"
import { buildStructuringMessages } from "../structure/prompt"
import { splitTranscriptChunks } from "../structure/chunk"
import { CLINICAL_NOTE_JSON_SCHEMA } from "../structure/json-schema"
import {
  normalizeStructuringOutput,
  parseModelJson,
  type StructuringOutput,
} from "../structure/schema"
import { mergeStructuringOutputs } from "../structure/merge"
import { noteFromStructuringOutput } from "../structure/note-from-output"
import type { TranscriptSegment } from "@oira/types"
import { ContextOverflowError } from "./sdk"
import type { QvacInferenceRuntime } from "./inference-runtime"

function messagesFor(
  transcript: readonly TranscriptSegment[],
): Array<{ role: string; content: string }> {
  const messages = buildStructuringMessages(transcript)
  return [
    { role: "system", content: messages.system },
    { role: "user", content: messages.user },
  ]
}

function parseCompletionJson(completion: {
  text: string
  thinkingText?: string
  rawText?: string
}): ReturnType<typeof parseModelJson> {
  const issues: string[] = []
  for (const candidate of [completion.text, completion.thinkingText, completion.rawText]) {
    if (!candidate?.trim()) continue
    const parsed = parseModelJson(candidate)
    if (parsed.ok) return parsed
    issues.push(...parsed.issues)
  }
  return { ok: false, issues: issues.length > 0 ? issues : ["La salida del modelo está vacía."] }
}

function rawFallbackText(completion: {
  text: string
  thinkingText?: string
  rawText?: string
}): string {
  return [completion.text, completion.thinkingText, completion.rawText]
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length > 0) ?? ""
}

function draftFromCompletion(
  completion: { text: string; thinkingText?: string; rawText?: string },
  knownSegmentIds: readonly string[],
): StructuringOutput {
  const parsed = parseCompletionJson(completion)
  if (parsed.ok) {
    return normalizeStructuringOutput(parsed.value, knownSegmentIds)
  }
  return normalizeStructuringOutput(rawFallbackText(completion), knownSegmentIds)
}

export function createQwenStructuring({
  runtime,
}: {
  runtime: QvacInferenceRuntime
}): StructuringPort {
  return {
    async structure({ transcript }) {
      const generation = runtime.beginGeneration()
      const chunks = splitTranscriptChunks(transcript)
      const outputs: StructuringOutput[] = []
      try {
        for (const chunk of chunks) {
          const completion = await runtime.completeStructuring({
            history: messagesFor(chunk),
            schema: CLINICAL_NOTE_JSON_SCHEMA,
            generation,
          })
          outputs.push(
            draftFromCompletion(
              completion,
              chunk.map((segment) => segment.id),
            ),
          )
        }
        const merged = mergeStructuringOutputs(outputs)
        return { note: noteFromStructuringOutput(merged) }
      } catch (error) {
        if (error instanceof ContextOverflowError) {
          throw invalidStructuredOutputError(
            "La consulta es demasiado extensa para el modelo local; no se generó un borrador inventado.",
          )
        }
        throw error
      }
    },
  }
}
