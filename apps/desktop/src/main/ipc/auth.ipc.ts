import { IPC_CHANNELS } from "./channels"
import {
  lockInputSchema,
  unlockInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerAuthIpc(
  handle: IpcHandle,
  deps: { session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.AUTH_UNLOCK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_UNLOCK,
      schema: unlockInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.session.unlock(input.pin),
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_LOCK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_LOCK,
      schema: lockInputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: () => deps.session.lock(),
    })(raw),
  )
}
