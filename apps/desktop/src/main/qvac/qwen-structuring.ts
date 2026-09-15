import type { StructuringPort, StructuringIssue } from "../inference/port"
import { invalidStructuredOutputError } from "../errors/notes"
import {
  allowedSourceIdsInstruction,
  buildStructuringMessages,
} from "../structure/prompt"
import { splitTranscriptChunks } from "../structure/chunk"
import { CLINICAL_NOTE_JSON_SCHEMA } from "../structure/json-schema"
import {
  parseModelJson,
  validateCompleteStructuringOutput,
  type StructuringOutput,
} from "../structure/schema"
import type { GenerationIssue } from "../structure/generation-errors"
import { mergeStructuringOutputs } from "../structure/merge"
import { noteFromStructuringOutput } from "../structure/note-from-output"
import { SECTION_IDS, SECTION_TITLES, type TranscriptSegment } from "@oira/types"
type QvacInferenceRuntime = {
  beginGeneration: () => number
  completeStructuring: (input: {
    history: Array<{ role: string; content: string }>
    schema: Record<string, unknown>
    generation: number
  }) => Promise<{ text: string; thinkingText?: string; rawText?: string }>
}

/** Reintentos de generación por chunk tras validación fallida (F1). */
export const STRUCTURE_GENERATION_ATTEMPTS = 2

type Feedback = readonly (GenerationIssue | string)[]

function isContextOverflowError(error: unknown): boolean {
  return error instanceof Error && error.constructor.name === "ContextOverflowError"
}

function messagesFor(
  transcript: readonly TranscriptSegment[],
  feedback?: Feedback,
): Array<{ role: string; content: string }> {
  const messages = buildStructuringMessages(transcript)
  const history = [
    { role: "system", content: messages.system },
    { role: "user", content: messages.user },
  ]
  if (feedback && feedback.length > 0) {
    const lines = feedback
      .map((issue) => (typeof issue === "string" ? `- ${issue}` : `- ${issue.message}`))
      .join("\n")
    const allowedIds = transcript.map((segment) => segment.id)
    history.push({
      role: "user",
      content:
        `La validación del intento anterior no pasó por estos motivos:\n${lines}\n` +
        `${allowedSourceIdsInstruction(allowedIds)}\n` +
        `Corrige el JSON y responde SOLO con el JSON {"sections": {...}}.`,
    })
  }
  return history
}

function parseCompletionJson(completion: {
  text: string
  thinkingText?: string
  rawText?: string
}): ReturnType<typeof parseModelJson> {
  return parseModelJson(completion.text)
}

function rawFallbackText(completion: {
  text: string
  thinkingText?: string
  rawText?: string
}): string {
  return [completion.text]
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length > 0) ?? ""
}

/** Printable de lo que sí se estructuró, para que el draft no válido no pierda esa parte. */
function printableOutput(output: StructuringOutput): string {
  return SECTION_IDS.map((id) => {
    const section = output.sections[id]
    if (!section || section.presence === "NOT_STATED") {
      return `- ${SECTION_TITLES[id]}: no consignado`
    }
    const label = section.presence === "UNKNOWN" ? "indeterminado" : "consignado"
    return `- ${SECTION_TITLES[id]} (${label}): ${section.text}`
  }).join("\n")
}

function toStructuringIssues(
  issues: readonly (GenerationIssue | string)[],
): StructuringIssue[] {
  return issues.map((issue) =>
    typeof issue === "string"
      ? { code: "PARSE_ERROR", message: issue }
      : { code: issue.code, sectionId: issue.sectionId, message: issue.message },
  )
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
      const unvalidated: Array<{ draftText: string; issues: Feedback }> = []
      try {
        for (const chunk of chunks) {
          const chunkIds = chunk.map((segment) => segment.id)
          let feedback: Feedback = []
          let draftText = ""
          let accepted = false
          for (let attempt = 0; attempt < STRUCTURE_GENERATION_ATTEMPTS; attempt++) {
            const completion = await runtime.completeStructuring({
              history: messagesFor(chunk, feedback),
              schema: CLINICAL_NOTE_JSON_SCHEMA,
              generation,
            })
            draftText = rawFallbackText(completion)
            const parsed = parseCompletionJson(completion)
            if (!parsed.ok) {
              feedback = parsed.issues
              continue
            }
            const validation = validateCompleteStructuringOutput(parsed.value, chunkIds)
            if (validation.ok) {
              outputs.push(validation.value)
              accepted = true
              break
            }
            feedback = validation.issues
          }
          if (!accepted) {
            unvalidated.push({
              draftText,
              issues: feedback.length > 0 ? feedback : ["La salida del modelo no fue aceptable."],
            })
          }
        }

        if (unvalidated.length > 0) {
          const parts: string[] = []
          if (outputs.length > 0) {
            parts.push(printableOutput(mergeStructuringOutputs(outputs)))
          }
          parts.push(
            "INTENTO SIN VALIDAR (no se presenta como nota):\n" +
              unvalidated.map((entry) => entry.draftText).filter(Boolean).join("\n\n"),
          )
          return {
            kind: "draft_unvalidated",
            draftText: parts.join("\n\n"),
            issues: unvalidated.flatMap((entry) => toStructuringIssues(entry.issues)),
          }
        }

        const merged = mergeStructuringOutputs(outputs)
        return { kind: "note", note: noteFromStructuringOutput(merged) }
      } catch (error) {
        if (isContextOverflowError(error)) {
          throw invalidStructuredOutputError(
            "La consulta es demasiado extensa para el modelo local; no se generó un borrador inventado.",
          )
        }
        throw error
      }
    },
  }
}
