import { IPC_CHANNELS } from "./channels"
import {
  storageInventoryInputSchema,
  storageInventoryOutputSchema,
} from "../../shared/schemas/ipc.schema"
import type { PurgePort } from "../privacy"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerPrivacyIpc(
  handle: IpcHandle,
  deps: { privacy: PurgePort; session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.STORAGE_INVENTORY, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.STORAGE_INVENTORY,
      schema: storageInventoryInputSchema,
      outputSchema: storageInventoryOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: () => deps.privacy.inventory(),
    })(raw),
  )
}
