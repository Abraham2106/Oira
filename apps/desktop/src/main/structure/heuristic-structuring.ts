import type { StructuringPort } from "../inference/port"
import { applyGlossary, assembleNote } from "./heuristic-assembler"

/** Driven adapter: heuristic assembler + glossary, no LLM. */
export function createHeuristicStructuring(): StructuringPort {
  return {
    async structure(input) {
      return { kind: "note", note: applyGlossary(assembleNote(input.transcript)) }
    },
  }
}
