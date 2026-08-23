import {
  structuredClinicalFactsSchema,
  type StructuredClinicalFacts,
} from "../../shared/schemas/clinical.schema"
import { createAppError } from "../utils/app-error"
import { loadStructuringPrompt, STRUCTURING_PROMPT_VERSION } from "./prompts"
import {
  createMockStructuringPort,
  type StructuringPort,
} from "./structuring.port"

const MAX_STRUCTURE_RETRIES = 1

export type StructuringResult = {
  facts: StructuredClinicalFacts
  raw: string
  promptVersion: string
  modelName: string
}

function parseFacts(raw: string): StructuredClinicalFacts {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw createAppError(
      "INVALID_STRUCTURED_OUTPUT",
      "The model output was not valid JSON.",
      { retryable: true },
    )
  }
  const result = structuredClinicalFactsSchema.safeParse(parsed)
  if (!result.success) {
    throw createAppError(
      "INVALID_STRUCTURED_OUTPUT",
      "The model output did not match the clinical schema.",
      { retryable: true },
    )
  }
  return result.data
}

export function createStructuringService(deps?: {
  model?: StructuringPort
  modelName?: string
  promptVersion?: string
}): {
  structure: (transcriptText: string) => Promise<StructuringResult>
} {
  const model = deps?.model ?? createMockStructuringPort()
  const modelName = deps?.modelName ?? "mock-structuring"
  const promptVersion = deps?.promptVersion ?? STRUCTURING_PROMPT_VERSION
  const prompt = loadStructuringPrompt(promptVersion)

  return {
    async structure(transcriptText) {
      let lastError: unknown
      for (let attempt = 0; attempt <= MAX_STRUCTURE_RETRIES; attempt += 1) {
        const raw = await model.complete({ prompt, transcriptText })
        try {
          const facts = parseFacts(raw)
          return { facts, raw, promptVersion, modelName }
        } catch (error) {
          lastError = error
        }
      }
      throw createAppError(
        "INVALID_STRUCTURED_OUTPUT",
        "The model output did not match the clinical schema.",
        { retryable: false, cause: lastError },
      )
    },
  }
}
