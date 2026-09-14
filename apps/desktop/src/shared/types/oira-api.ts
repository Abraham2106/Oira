import type { ClinicalNote, TranscriptSegment } from "@oira/types"
import type { EncounterStatus } from "../constants/encounter-status"
import type {
  AppendAudioInput,
  ClipboardWriteInput,
  ExportNoteInput,
  GenerateNoteInput,
  RetryAudioCleanupInput,
  SaveNoteInput,
  StartEncounterInput,
  StopEncounterInput,
} from "../schemas/ipc.schema"
import type { InferenceProgress } from "./inference-progress"
import type { ModelLifecycleEvent } from "./model-lifecycle"
import type { Result } from "./result"
import type { AppSettings } from "../schemas/settings.schema"
import type {
  AuthProfile,
  AuthSessionState,
} from "./auth-profile"

export type StartEncounterResult = {
  encounterId: string
  startedAt: string
}

export type WarmTranscriptionResult = {
  warmed: true
}

export type StopEncounterResult = {
  status: EncounterStatus
}

export type GenerateNoteResult = {
  status: "READY"
  transcript: TranscriptSegment[]
  note: ClinicalNote
} | {
  status: "CLEANUP_PENDING"
  transcript: TranscriptSegment[]
  note: ClinicalNote
  cleanup: { retryable: true }
}

export type SaveNoteResult = {
  status: "SAVED"
  noteId: string
} | {
  status: "PERSISTED_TRANSITION_PENDING"
  noteId: string
  recovery: { retryable: true }
}

export type RetryAudioCleanupResult = {
  cleaned: true
}

export type ExportNoteResult = {
  exported: true
}

export type WriteClipboardResult = {
  written: true
}

export type AppendAudioResult = {
  accepted: true
}

export type GetSettingsResult = AppSettings

export type SaveSettingsResult = AppSettings

/**
 * IPC contract (guide §10.2). Renderer consumes this via `window.oira`.
 * Draft notes are structured (I4 sections + transcript), not a free-text body.
 */
export type OiraApi = {
  warmTranscription: () => Promise<Result<WarmTranscriptionResult>>
  startEncounter: (
    input?: StartEncounterInput,
  ) => Promise<Result<StartEncounterResult>>
  stopEncounter: (
    input: StopEncounterInput,
  ) => Promise<Result<StopEncounterResult>>
  appendAudio: (input: AppendAudioInput) => Promise<Result<AppendAudioResult>>
  generateNote: (
    input: GenerateNoteInput,
  ) => Promise<Result<GenerateNoteResult>>
  saveNote: (input: SaveNoteInput) => Promise<Result<SaveNoteResult>>
  retryAudioCleanup: (
    input: RetryAudioCleanupInput,
  ) => Promise<Result<RetryAudioCleanupResult>>
  exportNote: (input: ExportNoteInput) => Promise<Result<ExportNoteResult>>
  writeClipboard: (
    input: ClipboardWriteInput,
  ) => Promise<Result<WriteClipboardResult>>
  getSettings: () => Promise<Result<AppSettings>>
  saveSettings: (input: {
    uiLocale: AppSettings["uiLocale"]
  }) => Promise<Result<AppSettings>>
  googleSignIn: () => Promise<Result<AuthProfile>>
  signOut: () => Promise<Result<{ signedOut: true }>>
  getAuthSession: () => Promise<Result<AuthSessionState>>
  onInferenceProgress: (
    listener: (event: InferenceProgress) => void,
  ) => () => void
  onModelLifecycle: (listener: (event: ModelLifecycleEvent) => void) => () => void
}
