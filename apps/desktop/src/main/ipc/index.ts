import { isAppErrorCode } from "../../shared/constants/app-error-codes"
import type { InferenceProgress } from "../../shared/types/inference-progress"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  createAudioTempStore,
  defaultAudioTempDir,
  type AudioTempStore,
} from "../audio"
import { createAuthStub, createGoogleAuthPortFromEnv, type GoogleAuthPort, type SessionPort } from "../auth"
import {
  createEncounterService,
  createMemoryEncounterRepository,
  type EncounterPort,
} from "../encounters"
import { createExportStub, type ExportPort } from "../export"
import type { InferenceAdapterName } from "../config/env"
import { resolveAppEnv } from "../config/env"
import {
  loadSettings,
  saveSettings as writeSettingsFile,
} from "../config/settings.service"
import { createInferencePorts } from "../inference"
import type { Logger } from "../logging"
import { createNotesService, type NotesPort } from "../notes"
import type { AppSettings } from "../../shared/schemas/settings.schema"
import type { Language } from "../../shared/constants/language"
import { registerAudioIpc } from "./audio.ipc"
import { registerAuthIpc } from "./auth.ipc"
import { registerClipboardIpc, type ClipboardPort } from "./clipboard.ipc"
import { registerEncounterIpc } from "./encounters.ipc"
import { registerExportIpc } from "./export.ipc"
import { registerNotesIpc } from "./notes.ipc"
import { registerSettingsIpc } from "./settings.ipc"
import type { IpcHandle } from "./types"
import type { IpcLogger } from "./withValidation"

export type IpcDeps = {
  encounters: EncounterPort
  notes: NotesPort
  exportNote: ExportPort
  session: SessionPort
  googleAuth?: GoogleAuthPort
  logger: IpcLogger
  audio: AudioTempStore
  settings: SettingsPort
  clipboard: ClipboardPort
}

export type SettingsPort = {
  get: () => Promise<AppSettings>
  save: (input: { uiLocale: Language }) => Promise<AppSettings>
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

export type StubIpcOptions = {
  audio?: AudioTempStore
  onProgress?: (event: InferenceProgress) => void
  inferenceAdapter?: InferenceAdapterName
  settingsFile?: string
  googleAuth?: GoogleAuthPort
  clipboard?: ClipboardPort
}

export function createSilentIpcLogger(): IpcLogger {
  return { call() {} }
}

/** Adapter only: IPC passes scalars, main/logging owns the format (§12). */
export function createIpcLogger(logger: Logger): IpcLogger {
  return {
    call(entry) {
      logger.log({
        action: `ipc.${entry.channel}`,
        status: entry.status,
        latencyMs: entry.latencyMs,
        errorCode: isAppErrorCode(entry.errorCode)
          ? entry.errorCode
          : undefined,
      })
    },
  }
}

export function createStubIpcDeps(
  logger: IpcLogger = createSilentIpcLogger(),
  options: StubIpcOptions = {},
): IpcDeps {
  const repository = createMemoryEncounterRepository()
  const audio =
    options.audio ??
    createAudioTempStore({ audioTempDir: defaultAudioTempDir() })
  const inferenceAdapter =
    options.inferenceAdapter ??
    resolveAppEnv({
      isPackaged: false,
      nodeEnv: process.env.NODE_ENV,
      inferenceAdapter: process.env.NOTALOCAL_INFERENCE,
    }).inferenceAdapter
  return {
    encounters: createEncounterService({ repository }),
    notes: createNotesService({
      encounters: repository,
      audio,
      onProgress: options.onProgress,
      ...createInferencePorts(inferenceAdapter),
    }),
    exportNote: createExportStub(),
    session: createAuthStub(),
    googleAuth: options.googleAuth ?? createGoogleAuthPortFromEnv(process.env),
    logger,
    audio,
    clipboard:
      options.clipboard ??
      ({
        writeText: () => undefined,
      } satisfies ClipboardPort),
    settings:
      options.settingsFile === undefined
        ? createFileSettingsPort(join(tmpdir(), "oira-dev-settings.json"))
        : createFileSettingsPort(options.settingsFile),
  }
}

export function registerIpc(handle: IpcHandle, deps: IpcDeps): void {
  registerEncounterIpc(handle, deps)
  registerAudioIpc(handle, deps)
  registerNotesIpc(handle, deps)
  registerClipboardIpc(handle, {
    clipboard: deps.clipboard,
    session: deps.session,
    logger: deps.logger,
  })
  registerExportIpc(handle, {
    exportNote: deps.exportNote,
    session: deps.session,
    logger: deps.logger,
  })
  registerAuthIpc(handle, {
    session: deps.session,
    googleAuth: deps.googleAuth,
    logger: deps.logger,
  })
  registerSettingsIpc(handle, deps)
}

export { IPC_CHANNELS } from "./channels"
export type { IpcHandle } from "./types"
