import { IPC_CHANNELS } from "./channels"
import {
  authStatusInputSchema,
  authStatusOutputSchema,
  lockInputSchema,
  lockOutputSchema,
  setPinInputSchema,
  setPinOutputSchema,
  unlockInputSchema,
  unlockOutputSchema,
} from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerAuthIpc(
  handle: IpcHandle,
  deps: { session: SessionPort; logger: IpcLogger },
): void {
  handle(IPC_CHANNELS.AUTH_STATUS, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_STATUS,
      schema: authStatusInputSchema,
      outputSchema: authStatusOutputSchema,
      session: deps.session,
      logger: deps.logger,
      run: () => deps.session.status(),
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_SET_PIN, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_SET_PIN,
      schema: setPinInputSchema,
      outputSchema: setPinOutputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.session.setPin(input.pin),
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_UNLOCK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_UNLOCK,
      schema: unlockInputSchema,
      outputSchema: unlockOutputSchema,
      session: deps.session,
      logger: deps.logger,
      run: (input) => deps.session.unlock(input.pin),
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_LOCK, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_LOCK,
      schema: lockInputSchema,
      outputSchema: lockOutputSchema,
      requiresSession: true,
      session: deps.session,
      logger: deps.logger,
      run: () => deps.session.lock(),
    })(raw),
  )
}
