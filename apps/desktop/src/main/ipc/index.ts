import { isAppErrorCode } from "../../shared/constants/app-error-codes"
import type { ApplicationPorts } from "../composition"
import type { Logger } from "../logging"
import { registerAudioIpc } from "./audio.ipc"
import { registerAuthIpc } from "./auth.ipc"
import { registerClipboardIpc } from "./clipboard.ipc"
import { registerEncounterIpc } from "./encounters.ipc"
import { registerExportIpc } from "./export.ipc"
import { registerInferenceIpc } from "./inference.ipc"
import { registerNotesIpc } from "./notes.ipc"
import { registerSettingsIpc } from "./settings.ipc"
import { registerSetupIpc } from "./setup.ipc"
import type { IpcHandle } from "./types"
import {
  createSilentIpcLogger,
  type IpcLogger,
} from "./withValidation"

export type IpcDeps = ApplicationPorts
export type { ApplicationPorts }
export {
  composeApplication,
  createStubIpcDeps,
  type ComposeApplicationOptions as StubIpcOptions,
} from "../composition"
export { createSilentIpcLogger }
export type { IpcLogger }

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

/** Driving adapter: maps validated IPC to inbound ports. No composition here. */
export function registerIpc(handle: IpcHandle, deps: IpcDeps): void {
  registerInferenceIpc(handle, {
    inferenceRuntime: deps.inferenceRuntime,
    session: deps.session,
    logger: deps.logger,
  })
  registerEncounterIpc(handle, {
    encounters: deps.encounters,
    session: deps.session,
    logger: deps.logger,
    inferenceRuntime: deps.inferenceRuntime,
  })
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
  registerSetupIpc(handle, {
    setup: deps.setup,
    session: deps.session,
    logger: deps.logger,
    onProgress: deps.onSetupProgress,
  })
}

export { IPC_CHANNELS } from "./channels"
export type { IpcHandle } from "./types"
