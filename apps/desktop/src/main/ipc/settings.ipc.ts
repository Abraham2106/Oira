import { IPC_CHANNELS } from "./channels"
import {
  getSettingsInputSchema,
  saveSettingsInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { AppSettings } from "../../shared/schemas/settings.schema"
import type { Language } from "../../shared/constants/language"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export type SettingsIpcPort = {
  get: () => Promise<AppSettings>
  save: (input: { uiLocale: Language }) => Promise<AppSettings>
}

export function registerSettingsIpc(
  handle: IpcHandle,
  deps: { settings: SettingsIpcPort; session: SessionPort; logger: IpcLogger },
): void {
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
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.settings.save(input),
    })(raw),
  )
}
