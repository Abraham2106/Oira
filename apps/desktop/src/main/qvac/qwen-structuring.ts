import type { StructuringPort } from "../inference/port"
import { invalidStructuredOutputError } from "../errors/notes"
import { buildStructuringMessages } from "../structure/prompt"
import { splitTranscriptChunks } from "../structure/chunk"
import { CLINICAL_NOTE_JSON_SCHEMA } from "../structure/json-schema"
import {
  parseModelJson,
  validateStructuringOutput,
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
}): ReturnType<typeof parseModelJson> {
  return parseModelJson(completion.text)
}

function draftFromCompletion(
  completion: { text: string; thinkingText?: string; rawText?: string },
  knownSegmentIds: readonly string[],
): StructuringOutput {
  const parsed = parseCompletionJson(completion)
  if (!parsed.ok) throw invalidStructuredOutputError()
  const validated = validateStructuringOutput(parsed.value, knownSegmentIds)
  if (!validated.ok) throw invalidStructuredOutputError()
  return validated.value
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
