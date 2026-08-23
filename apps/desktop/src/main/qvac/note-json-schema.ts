import { SECTION_IDS } from "@notalocal/types"

const fieldSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "presence", "sourceSegmentIds"],
  properties: {
    text: { type: "string" },
    presence: {
      type: "string",
      enum: ["STATED", "NOT_STATED", "UNKNOWN"],
    },
    sourceSegmentIds: { type: "array", items: { type: "string" } },
  },
} as const

/** JSON Schema forwarded to llama.cpp GBNF. Keep `$ref`-free. */
export const CLINICAL_NOTE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    sections: {
      type: "object",
      additionalProperties: false,
      required: [...SECTION_IDS],
      properties: Object.fromEntries(SECTION_IDS.map((id) => [id, fieldSchema])),
    },
  },
} as const
