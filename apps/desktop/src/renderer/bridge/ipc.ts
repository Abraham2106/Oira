import type { ClinicalNote } from "@notalocal/types"
import type { NotaLocalAPI } from "../../shared/types/notalocal-api"
import type { Result } from "../../shared/types/result"
import type { DemoBridge } from "./mock"

async function unwrap<T>(resultPromise: Promise<Result<T>>): Promise<T> {
  const result = await resultPromise
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.data
}

/** Maps Justin's `Result<T>` IPC API to the renderer DemoBridge shape. */
export function adaptNotaLocalApi(api: NotaLocalAPI): DemoBridge {
  return {
    async startEncounter(input) {
      return unwrap(
        api.startEncounter({
          label: input.label,
          visitType: input.visitType,
        }),
      )
    },
    async stopEncounter(encounterId) {
      await unwrap(api.stopEncounter({ encounterId }))
    },
    async generateNote(encounterId) {
      return unwrap(api.generateNote({ encounterId }))
    },
    async saveNote(encounterId, note: ClinicalNote) {
      await unwrap(api.saveNote({ encounterId, note }))
    },
  }
}
