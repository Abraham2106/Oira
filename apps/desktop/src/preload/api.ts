import type { Result } from "../shared/types/result"
import type { EncounterStatus } from "../shared/constants/encounter-status"
import type { DraftNote } from "../shared/types/notes"

export type NotaLocalAPI = {
  startEncounter: () => Promise<Result<{ encounterId: string }>>
  stopEncounter: (input: {
    encounterId: string
  }) => Promise<Result<{ status: EncounterStatus }>>
  getEncounter: (input: { encounterId: string }) => Promise<
    Result<{
      id: string
      status: EncounterStatus
      createdAt: string
      startedAt: string | null
      endedAt: string | null
      updatedAt: string
      completedAt: string | null
      transcriptId: string | null
    }>
  >
  discardEncounter: (input: {
    encounterId: string
  }) => Promise<Result<{ status: EncounterStatus }>>
  cancelTranscription: (input: {
    encounterId: string
  }) => Promise<Result<{ status: EncounterStatus }>>
  pushAudioChunk: (input: {
    encounterId: string
    chunk: Uint8Array
  }) => Promise<Result<void>>
  generateNote: (input: {
    encounterId: string
  }) => Promise<Result<{ draft: DraftNote }>>
  saveNote: (input: {
    encounterId: string
    body: string
  }) => Promise<Result<{ noteId: string }>>
  exportNote: (input: {
    encounterId: string
    format: "txt" | "json" | "clipboard"
  }) => Promise<Result<{ exported: true }>>
  unlock: (input: { pin: string }) => Promise<Result<{ unlocked: true }>>
  lock: () => Promise<Result<{ locked: true }>>
  setPin: (input: { pin: string }) => Promise<Result<{ set: true }>>
  authStatus: () => Promise<
    Result<{ hasPin: boolean; authenticated: boolean }>
  >
  storageInventory: () => Promise<
    Result<{
      encounters: number
      transcripts: number
      notes: number
      audioDirs: number
    }>
  >
  onEvent: (callback: (event: unknown) => void) => () => void
}
