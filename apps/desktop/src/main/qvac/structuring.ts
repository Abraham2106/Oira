import os from "node:os"
import { SECTION_IDS, type ClinicalNote, type FieldValue } from "@notalocal/types"
import { z } from "zod"
import { isAppError } from "../errors/core"
import { invalidStructuredOutputError } from "../errors/notes"
import { transcriptionFailedError } from "../errors/inference"
import type { StructuringPort } from "../inference/port"
import { CLINICAL_NOTE_JSON_SCHEMA } from "./note-json-schema"
import { P0_LLM_MODEL_ID } from "./model-ids"
import { buildExtractionPrompt, QWEN_SYSTEM_PROMPT } from "./prompts"

const LOAD_WATCHDOG_MS = 120_000
const COMPLETION_WATCHDOG_MS = 180_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

const llmFieldSchema = z.object({
  text: z.string(),
  presence: z.enum(["STATED", "NOT_STATED", "UNKNOWN"]),
  sourceSegmentIds: z.array(z.string()),
})

const llmNoteSchema = z.object({
  sections: z.object({
    visit_context: llmFieldSchema,
    clinical_narrative: llmFieldSchema,
    relevant_history: llmFieldSchema,
    reported_findings: llmFieldSchema,
    clinician_documented_assessment: llmFieldSchema,
    clinician_documented_plan: llmFieldSchema,
    follow_up: llmFieldSchema,
  }),
})

function assertMemory(): void {
  if (process.env.NODE_ENV === "test") return
  if (os.freemem() < MIN_FREE_BYTES) {
    throw transcriptionFailedError("LOW_MEMORY")
  }
}

function sanitizeNote(note: ClinicalNote, allowedIds: Set<string>): ClinicalNote {
  const sections = {} as ClinicalNote["sections"]
  for (const id of SECTION_IDS) {
    const field = note.sections[id]
    const text = field.text.trim()
    const sources = field.sourceSegmentIds.filter((sourceId) => allowedIds.has(sourceId))
    if (!text) {
      sections[id] = {
        text: "",
        presence: "NOT_STATED",
        sourceSegmentIds: [],
        reviewed: false,
      }
      continue
    }
    sections[id] = {
      text,
      presence: field.presence === "UNKNOWN" ? "UNKNOWN" : "STATED",
      sourceSegmentIds: sources,
      reviewed: false,
    }
  }
  return { sections }
}

function hydrateNote(raw: unknown): ClinicalNote {
  const parsed = llmNoteSchema.safeParse(raw)
  if (!parsed.success) throw invalidStructuredOutputError()
  const sections = {} as ClinicalNote["sections"]
  for (const id of SECTION_IDS) {
    const field: FieldValue = { ...parsed.data.sections[id], reviewed: false }
    sections[id] = field
  }
  return { sections }
}

async function drainCompletion(
  run: {
    events: AsyncIterable<unknown>
    final: Promise<{ contentText?: string }>
  },
): Promise<string> {
  for await (const _event of run.events) {
    void _event
  }
  const final = await run.final
  return (final.contentText ?? "").trim()
}

/** On-device Qwen 600M: load → json_schema completion → unload → close. */
export function createQvacStructuring(): StructuringPort {
  return {
    async structure(input) {
      const {
        close,
        completion,
        loadModel,
        unloadModel,
        QWEN3_600M_INST_Q4,
      } = await import("./sdk")
      if (QWEN3_600M_INST_Q4.name !== P0_LLM_MODEL_ID) {
        throw transcriptionFailedError("SMOKE_MODEL_MISMATCH")
      }
      assertMemory()
      let modelId: string | undefined
      try {
        modelId = await Promise.race([
          loadModel({ modelSrc: QWEN3_600M_INST_Q4 }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(transcriptionFailedError("LOAD_WATCHDOG")), LOAD_WATCHDOG_MS)
          }),
        ])
        const run = completion({
          modelId,
          history: [
            { role: "system", content: QWEN_SYSTEM_PROMPT },
            { role: "user", content: buildExtractionPrompt(input.transcript) },
          ],
          stream: true,
          kvCache: false,
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "clinical_note",
              schema: CLINICAL_NOTE_JSON_SCHEMA as unknown as Record<string, unknown>,
            },
          },
          generationParams: { temp: 0, seed: 42, predict: 2048, reasoning_budget: 0 },
        })
        const rawText = await Promise.race([
          drainCompletion(run),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(transcriptionFailedError("COMPLETION_WATCHDOG")),
              COMPLETION_WATCHDOG_MS,
            )
          }),
        ])
        let parsedJson: unknown
        try {
          parsedJson = JSON.parse(rawText)
        } catch {
          throw invalidStructuredOutputError()
        }
        return {
          note: sanitizeNote(
            hydrateNote(parsedJson),
            new Set(input.transcript.map((segment) => segment.id)),
          ),
        }
      } catch (error) {
        if (isAppError(error)) throw error
        throw invalidStructuredOutputError(
          error instanceof Error ? error.message : "INVALID_STRUCTURED_OUTPUT",
        )
      } finally {
        if (modelId) await unloadModel({ modelId }).catch(() => undefined)
        await close().catch(() => undefined)
      }
    },
  }
}
