import type { ClinicalNote } from "@oira/types"
import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import type { OiraApi } from "../../shared/types/oira-api"
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
export function adaptOiraApi(api: OiraApi): DemoBridge {
  return {
    async warmTranscription() {
      await unwrap(api.warmTranscription())
    },
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
    async saveNote(encounterId, note: ClinicalNote, clinicianConfirmed: true) {
      const parsed = clinicalNoteSchema.safeParse(note)
      if (!parsed.success) {
        throw new Error("La nota requiere revisión clínica antes de guardarse.")
      }
      return unwrap(api.saveNote({ encounterId, note: parsed.data, clinicianConfirmed }))
    },
    async retryAudioCleanup(encounterId) {
      await unwrap(api.retryAudioCleanup({ encounterId }))
    },
    async exportNote(encounterId, format = "txt") {
      return unwrap(api.exportNote({ encounterId, format }))
    },
    async writeClipboard(text: string) {
      await unwrap(api.writeClipboard({ text }))
    },
    async appendAudio(input) {
      await unwrap(api.appendAudio(input))
    },
    async getSettings() {
      return unwrap(api.getSettings())
    },
    async saveSettings(settings) {
      return unwrap(api.saveSettings(settings))
    },
    async googleSignIn() {
      return unwrap(api.googleSignIn())
    },
    async signOut() {
      return unwrap(api.signOut())
    },
    async getAuthSession() {
      return unwrap(api.getAuthSession())
    },
    onInferenceProgress(listener: (event: InferenceProgress) => void) {
      return api.onInferenceProgress(listener)
    },
    onModelLifecycle(listener) {
      return api.onModelLifecycle(listener)
    },
  }
}
