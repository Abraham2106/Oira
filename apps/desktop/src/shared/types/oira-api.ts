import type { ClinicalNote, TranscriptSegment } from "@oira/types"
import type { EncounterStatus } from "../constants/encounter-status"
import type {
  AppendAudioInput,
  ClipboardWriteInput,
  ExportNoteInput,
  GenerateNoteInput,
  SaveNoteInput,
  RetryAudioCleanupInput,
  StartEncounterInput,
  StopEncounterInput,
} from "../schemas/ipc.schema"
import type { InferenceProgress } from "./inference-progress"
import type { NoteVerificationResult } from "./note-verification"
import type { ModelLifecycleEvent } from "./model-lifecycle"
import type { Result } from "./result"
import type { AppSettings } from "../schemas/settings.schema"
import type { SetupProgress, SetupStatus } from "./setup"
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

export type GenerateNoteIssue = {
  code: string
  sectionId?: string
  message: string
}

/**
 * Resultado de la generación. `status: "draft_unvalidated"` significa que el
 * generador (QVAC) agotó sus reintentos sin pasar el contrato estricto: la
 * transcripción se conserva, `draftText` es el intento crudo del modelo y
 * `issues[]` explica el porqué. El renderer debe presentarlo como borrador NO
 * validado, nunca como nota.
 */
export type GenerateNoteResult =
  | ({
      status: "READY"
      cleanup?: never
    } | {
      status: "CLEANUP_PENDING"
      cleanup: { retryable: true }
    }) & {
      transcript: TranscriptSegment[]
      note: ClinicalNote
      verificationWarnings?: GenerateNoteIssue[]
      reviewerResult?: NoteVerificationResult
    }
  | {
      status: "draft_unvalidated"
      transcript: TranscriptSegment[]
      draftText: string
      issues: GenerateNoteIssue[]
      cleanup?: { retryable: true }
    }

export type SaveNoteResult = { status: "SAVED"; noteId: string } | {
  status: "PERSISTED_TRANSITION_PENDING"; noteId: string; recovery: { retryable: true }
}
export type RetryAudioCleanupResult = { cleaned: true }

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
  getSetupStatus: () => Promise<Result<SetupStatus>>
  provisionModels: () => Promise<Result<SetupStatus>>
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
  retryAudioCleanup: (input: RetryAudioCleanupInput) => Promise<Result<RetryAudioCleanupResult>>
  saveNote: (input: SaveNoteInput) => Promise<Result<SaveNoteResult>>
  exportNote: (input: ExportNoteInput) => Promise<Result<ExportNoteResult>>
  writeClipboard: (
    input: ClipboardWriteInput,
  ) => Promise<Result<WriteClipboardResult>>
  getSettings: () => Promise<Result<AppSettings>>
  saveSettings: (input: {
    uiLocale?: AppSettings["uiLocale"]
    gpuPreference?: AppSettings["gpuPreference"]
  }) => Promise<Result<AppSettings>>
  googleSignIn: () => Promise<Result<AuthProfile>>
  signOut: () => Promise<Result<{ signedOut: true }>>
  getAuthSession: () => Promise<Result<AuthSessionState>>
  onInferenceProgress: (
    listener: (event: InferenceProgress) => void,
  ) => () => void
  onModelLifecycle: (listener: (event: ModelLifecycleEvent) => void) => () => void
  onSetupProgress: (listener: (event: SetupProgress) => void) => () => void
}
