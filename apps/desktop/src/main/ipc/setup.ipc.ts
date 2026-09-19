import { IPC_CHANNELS } from "./channels"
import { getSettingsInputSchema } from "../../shared/schemas/ipc.schema"
import type { SetupProgress } from "../../shared/types/setup"
import type { SetupService } from "../setup"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerSetupIpc(
  handle: IpcHandle,
  deps: {
    setup?: SetupService
    session: SessionPort
    logger: IpcLogger
    onProgress?: (event: SetupProgress) => void
  },
): void {
  // Setup status/provisioning are intentionally session-free: first-run model
  // download happens before any login exists. Revisit when auth is re-enabled
  // if provisioning must become an authenticated action.
  handle(IPC_CHANNELS.SETUP_GET_STATUS, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.SETUP_GET_STATUS,
      schema: getSettingsInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        if (!deps.setup) throw new Error("Model setup is unavailable")
        return deps.setup.getStatus()
      },
    })(raw),
  )

  handle(IPC_CHANNELS.SETUP_PROVISION, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.SETUP_PROVISION,
      schema: getSettingsInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        if (!deps.setup) throw new Error("Model setup is unavailable")
        return deps.setup.provisionModels((event) => deps.onProgress?.(event)).then((status) => status)
      },
    })(raw),
  )
}
