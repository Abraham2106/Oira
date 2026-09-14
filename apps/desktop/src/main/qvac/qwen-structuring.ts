import type { StructuringPort, StructuringIssue } from "../inference/port"
import { invalidStructuredOutputError } from "../errors/notes"
import { buildStructuringMessages } from "../structure/prompt"
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
import { ContextOverflowError } from "./sdk"
import type { QvacInferenceRuntime } from "./inference-runtime"

/** Reintentos de generación por chunk tras validación fallida (F1). */
export const STRUCTURE_GENERATION_ATTEMPTS = 2

type Feedback = readonly (GenerationIssue | string)[]

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
    history.push({
      role: "user",
      content:
        `La validación del intento anterior no pasó por estos motivos:\n${lines}\n` +
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