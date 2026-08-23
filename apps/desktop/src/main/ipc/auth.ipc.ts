import { IPC_CHANNELS } from "./channels"
import {
  getAuthSessionInputSchema,
  googleSignInInputSchema,
  lockInputSchema,
  signOutInputSchema,
  unlockInputSchema,
} from "../../shared/schemas/ipc.schema"
import type { SessionPort } from "../auth"
import type { GoogleAuthPort } from "../auth"
import { withValidation, type IpcLogger } from "./withValidation"
import type { IpcHandle } from "./types"

export function registerAuthIpc(
  handle: IpcHandle,
  deps: {
    session: SessionPort
    googleAuth?: GoogleAuthPort
    logger: IpcLogger
  },
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

  handle(IPC_CHANNELS.AUTH_GOOGLE_START, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_GOOGLE_START,
      schema: googleSignInInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        const googleAuth = deps.googleAuth
        if (!googleAuth) {
          throw new Error("Google sign-in is not available in this build.")
        }
        return googleAuth.signIn()
      },
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_SIGN_OUT, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_SIGN_OUT,
      schema: signOutInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async () => {
        if (!deps.googleAuth) {
          return { signedOut: true }
        }
        await deps.googleAuth.signOut()
        return { signedOut: true }
      },
    })(raw),
  )

  handle(IPC_CHANNELS.AUTH_SESSION_GET, (_event, raw) =>
    withValidation({
      channel: IPC_CHANNELS.AUTH_SESSION_GET,
      schema: getAuthSessionInputSchema,
      session: deps.session,
      logger: deps.logger,
      run: async () =>
        deps.googleAuth?.session() ?? { authenticated: false, profile: null },
    })(raw),
  )
}
