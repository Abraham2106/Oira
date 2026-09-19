import { IPC_CHANNELS } from "./channels"
import {
  getSettingsInputSchema,
  saveSettingsInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import type { SettingsPort } from "../ports/outbound"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export type SettingsIpcPort = SettingsPort

export function registerSettingsIpc(
  handle: IpcHandle,
  deps: { settings: SettingsIpcPort; session: SessionPort; logger: IpcLogger },
): void {
  // SETTINGS_GET is intentionally session-free: the boot/login screens need
  // the persisted locale before any session exists. SETTINGS_SAVE stays gated.
  handle(IPC_CHANNELS.SETTINGS_GET, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.SETTINGS_GET,
      schema: getSettingsInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: () => deps.settings.get(),
    })(raw),
  )

  handle(IPC_CHANNELS.SETTINGS_SAVE, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.SETTINGS_SAVE,
      schema: saveSettingsInputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.settings.save(input),
    })(raw),
  )
}
