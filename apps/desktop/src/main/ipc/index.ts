import { tmpdir } from "node:os"
import { join } from "node:path"
import { createAudioService } from "../audio"
import { createAuthService, createMemoryPinStore, type SessionPort } from "../auth"
import { createEncounterService, type EncounterPort } from "../encounters"
import { createMemoryEncounterRepository } from "../encounters/encounter.repository"
import {
  createExportService,
  createMemoryClipboard,
  type ExportPort,
} from "../export"
import {
  createMemoryNotesRepository,
  createNotesService,
  type NotesPort,
} from "../notes"
import { createPurgeService, type PurgePort } from "../privacy"
import {
  createOfflineQvacRuntime,
  createQvacClient,
  createStructuringAdapter,
  createTranscriptionAdapter,
} from "../qvac"
import {
  createMemoryTranscriptRepository,
  createTranscriptionService,
} from "../transcription"
import { registerAuthIpc } from "./auth.ipc"
import { registerEncounterIpc } from "./encounters.ipc"
import { registerExportIpc } from "./export.ipc"
import { registerNotesIpc } from "./notes.ipc"
import { registerPrivacyIpc } from "./privacy.ipc"
import type { IpcHandle } from "./types"
import { createIpcLogger, createLogger } from "../logging"
import type { IpcLogger } from "./withValidation"

export type IpcDeps = {
  encounters: EncounterPort
  notes: NotesPort
  exportNote: ExportPort
  session: SessionPort
  privacy: PurgePort
  logger: IpcLogger
}

export function createSilentIpcLogger(): IpcLogger {
  return { call() {} }
}

export function createJsonIpcLogger(): IpcLogger {
  return createIpcLogger(createLogger())
}

export function createStubIpcDeps(logger: IpcLogger = createSilentIpcLogger()): IpcDeps {
  const audio = createAudioService(join(tmpdir(), "notalocal-desktop-audio"))
  const encounterRepo = createMemoryEncounterRepository()
  const transcripts = createMemoryTranscriptRepository()
  const notesRepo = createMemoryNotesRepository()
  const qvac = createQvacClient({
    runtime: createOfflineQvacRuntime(),
    modelSrc: { stt: "offline-stt", structuring: "offline-llm" },
  })
  const transcription = createTranscriptionService({
    transcripts,
    stt: createTranscriptionAdapter(qvac),
  })
  const privacy = createPurgeService({
    audio,
    encounters: encounterRepo,
    transcripts,
    notes: notesRepo,
  })
  const encounters = createEncounterService({
    repository: encounterRepo,
    audio,
    transcription,
    onDiscarded: async (id) => {
      await privacy.purgeEncounter(id)
    },
  })
  const notes = createNotesService({
    encounters,
    transcripts,
    notes: notesRepo,
    model: createStructuringAdapter(qvac),
    onApproved: (id) => privacy.purgeAudio(id),
  })
  return {
    encounters,
    notes,
    exportNote: createExportService({
      getExportable: (id) => notes.getExportable(id),
      dialog: {
        async chooseSavePath({ format }) {
          return join(tmpdir(), `notalocal-export.${format}`)
        },
      },
      clipboard: createMemoryClipboard(),
      writeFile: async () => {},
    }),
    session: createAuthService({ pinStore: createMemoryPinStore() }),
    privacy,
    logger,
  }
}

export function registerIpc(handle: IpcHandle, deps: IpcDeps): void {
  registerEncounterIpc(handle, deps)
  registerNotesIpc(handle, deps)
  registerExportIpc(handle, { exportNote: deps.exportNote, session: deps.session, logger: deps.logger })
  registerAuthIpc(handle, deps)
  registerPrivacyIpc(handle, {
    privacy: deps.privacy,
    session: deps.session,
    logger: deps.logger,
  })
}

export { IPC_CHANNELS } from "./channels"
export type { IpcHandle } from "./types"
