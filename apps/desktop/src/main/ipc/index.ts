import { isAppErrorCode } from "../../shared/constants/app-error-codes"
import { createAuthStub, type SessionPort } from "../auth"
import {
  createEncounterService,
  createMemoryEncounterRepository,
  type EncounterPort,
} from "../encounters"
import { createExportStub, type ExportPort } from "../export"
import type { Logger } from "../logging"
import { createNotesStub, type NotesPort } from "../notes"
import { registerAuthIpc } from "./auth.ipc"
import { registerEncounterIpc } from "./encounters.ipc"
import { registerExportIpc } from "./export.ipc"
import { registerNotesIpc } from "./notes.ipc"
import type { IpcHandle } from "./types"
import type { IpcLogger } from "./withValidation"

export type IpcDeps = {
  encounters: EncounterPort
  notes: NotesPort
  exportNote: ExportPort
  session: SessionPort
  logger: IpcLogger
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

export function createStubIpcDeps(logger: IpcLogger = createSilentIpcLogger()): IpcDeps {
  const repository = createMemoryEncounterRepository()
  return {
    encounters: createEncounterService({ repository }),
    notes: createNotesStub({ encounters: repository }),
    exportNote: createExportStub(),
    session: createAuthStub(),
    logger,
  }
}

export function registerIpc(handle: IpcHandle, deps: IpcDeps): void {
  registerEncounterIpc(handle, deps)
  registerNotesIpc(handle, deps)
  registerExportIpc(handle, { exportNote: deps.exportNote, session: deps.session, logger: deps.logger })
  registerAuthIpc(handle, deps)
}

export { IPC_CHANNELS } from "./channels"
export type { IpcHandle } from "./types"
