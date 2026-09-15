import { dirname, join } from "node:path"
import { tmpdir } from "node:os"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import type { ModelLifecycleEvent } from "../../shared/types/model-lifecycle"
import type { SetupProgress } from "../../shared/types/setup"
import {
  createAudioTempStore,
  defaultAudioTempDir,
} from "../audio"
import {
  createAuthenticatedSession,
  createGoogleAuthPortFromEnv,
  type GoogleAuthPort,
  type SessionPort,
} from "../auth"
import type { InferenceAdapterName } from "../config/env"
import { resolveAppEnv } from "../config/env"
import {
  loadSettings,
  saveSettings as writeSettingsFile,
} from "../config/settings.service"
import {
  createEncounterService,
  createMemoryEncounterRepository,
  type EncounterPort,
} from "../encounters"
import {
  createFileExportAdapter,
  nodeFileWriter,
  type ExportPort,
} from "../export"
import { createInferencePorts } from "../inference"
import { createNotesService, type NotesPort } from "../notes"
import type { NoteVerifierPort } from "../../shared/types/note-verification"
import type {
  AudioCapturePort,
  ClipboardPort,
  IpcLogPort,
  NoteStorePort,
  ProgressPort,
  SettingsPort,
  StructuringPort,
  TranscriptionPort,
  InferenceRuntimePort,
} from "../ports"
import { createMemoryNoteStore } from "../storage/memory.store"
import { createJsonFileStore } from "../storage/json-file.store"
import { manifestEntry } from "../setup/manifest"
import type { SetupService } from "../setup/service"

export type ApplicationPorts = {
  encounters: EncounterPort
  notes: NotesPort
  exportNote: ExportPort
  session: SessionPort
  googleAuth?: GoogleAuthPort
  logger: IpcLogPort
  audio: AudioCapturePort
  settings: SettingsPort
  clipboard: ClipboardPort
  inferenceRuntime?: InferenceRuntimePort
  reviewer?: NoteVerifierPort
  setup?: SetupService
  onSetupProgress?: (event: SetupProgress) => void
}

export type ComposeApplicationOptions = {
  audio?: AudioCapturePort
  onProgress?: (event: InferenceProgress) => void
  onModelLifecycle?: (event: ModelLifecycleEvent) => void
  inferenceAdapter?: InferenceAdapterName
  settingsFile?: string
  googleAuth?: GoogleAuthPort
  clipboard?: ClipboardPort
  notesStore?: NoteStorePort
  notesFile?: string
  exportDir?: string
  transcription?: TranscriptionPort
  structuring?: StructuringPort
  session?: SessionPort
  exportNote?: ExportPort
  inferenceRuntime?: InferenceRuntimePort
  reviewer?: NoteVerifierPort
  modelCacheDir?: string
  setup?: SetupService
  onSetupProgress?: (event: SetupProgress) => void
}

function createFileSettingsPort(settingsFile: string): SettingsPort {
  return {
    get: async () => loadSettings(settingsFile),
    save: async (input) =>
      writeSettingsFile(settingsFile, {
        ...loadSettings(settingsFile),
        ...input,
      }),
  }
}

function resolveNoteStore(options: ComposeApplicationOptions): NoteStorePort {
  if (options.notesStore) return options.notesStore
  if (options.notesFile) return createJsonFileStore(options.notesFile)
  return createMemoryNoteStore()
}

function toProgressPort(
  onProgress?: (event: InferenceProgress) => void,
): ProgressPort {
  return { emit: onProgress ?? (() => undefined) }
}

function defaultSession(_googleAuth: GoogleAuthPort, override?: SessionPort): SessionPort {
  if (override) return override
  // Temporary product mode: the renderer intentionally bypasses login while
  // the local-first consultation workflow is being validated end-to-end.
  // Keep Google wiring available for the later re-enable rather than removing
  // its implementation from the composition root.
  return createAuthenticatedSession()
}

/**
 * Composition root: wires inbound services to outbound adapters.
 * IPC must not compose dependencies; it only registers handlers.
 */
export function composeApplication(
  logger: IpcLogPort = { call() {} },
  options: ComposeApplicationOptions = {},
): ApplicationPorts {
  const repository = createMemoryEncounterRepository()
  const audio =
    options.audio ??
    createAudioTempStore({ audioTempDir: defaultAudioTempDir() })
  const inferenceAdapter =
    options.inferenceAdapter ??
    resolveAppEnv({
      isPackaged: false,
      nodeEnv: process.env.NODE_ENV,
      inferenceAdapter:
        process.env.OIRA_INFERENCE ?? process.env.NOTALOCAL_INFERENCE,
    }).inferenceAdapter
  const inference = createInferencePorts(inferenceAdapter, {
    onModelLifecycle: options.onModelLifecycle,
    modelPaths: options.modelCacheDir
      ? {
          whisper: join(options.modelCacheDir, manifestEntry("whisper").filename),
          qwen: join(options.modelCacheDir, manifestEntry("qwen").filename),
        }
      : undefined,
  })
  const runtime = options.inferenceRuntime ?? inference.runtime
  // La segunda pasada Qwen está desactivada por defecto: duplicaba el costo
  // de inferencia. Un consumidor de evaluación aún puede inyectarla de forma
  // explícita mediante options.reviewer.
  const reviewer = options.reviewer
  const notesStore = resolveNoteStore(options)
  const exportDir =
    options.exportDir ??
    (options.notesFile
      ? dirname(options.notesFile)
      : join(tmpdir(), "oira-exports"))
  const googleAuth = options.googleAuth ?? createGoogleAuthPortFromEnv(process.env)
  const encounters = createEncounterService({ repository, audio })

  return {
    encounters,
    notes: createNotesService({
      encounters,
      audio,
      progress: toProgressPort(options.onProgress),
      notes: notesStore,
      transcription: options.transcription ?? inference.transcription,
      structuring: options.structuring ?? inference.structuring,
      inferenceRuntime: runtime,
      reviewer,
    }),
    exportNote:
      options.exportNote ??
      createFileExportAdapter({
        notes: notesStore,
        writer: nodeFileWriter,
        exportDir,
      }),
    session: defaultSession(googleAuth, options.session),
    googleAuth,
    logger,
    audio,
    clipboard:
      options.clipboard ??
      ({
        writeText: () => undefined,
      } satisfies ClipboardPort),
    inferenceRuntime: runtime,
    reviewer,
    settings:
      options.settingsFile === undefined
        ? createFileSettingsPort(join(tmpdir(), "oira-dev-settings.json"))
        : createFileSettingsPort(options.settingsFile),
    setup: options.setup,
    onSetupProgress: options.onSetupProgress,
  }
}

/** @deprecated Use composeApplication. Kept so existing IPC tests keep compiling. */
export const createStubIpcDeps = composeApplication
