import type { AuthProfile, AuthSessionState } from "../../shared/types/auth-profile"
import { DEMO_AUTH_PROFILE } from "../../shared/types/auth-profile"

/**
 * Google identity port for Login/Signup. The production flow is OAuth 2.0 +
 * PKCE through the system browser with a loopback redirect; it activates as
 * soon as OIRA_GOOGLE_CLIENT_ID is configured. Until then the deterministic
 * demo profile keeps the UI honest about being a prototype fixture.
 */
export type GoogleAuthPort = {
  signIn: () => Promise<AuthProfile>
  signOut: () => Promise<{ signedOut: true }>
  session: () => AuthSessionState
}

export function createDemoGoogleAuthPort(): GoogleAuthPort {
  let profile: AuthProfile | null = null
  return {
    async signIn() {
      profile = { ...DEMO_AUTH_PROFILE }
      return { ...profile }
    },
    async signOut() {
      profile = null
      return { signedOut: true }
    },
    session() {
      return {
        authenticated: profile !== null,
        profile: profile ? { ...profile } : null,
      }
    },
  }
}

export function resolveGoogleClientId(env: NodeJS.ProcessEnv): string | null {
  return env.OIRA_GOOGLE_CLIENT_ID?.trim() || null
}
