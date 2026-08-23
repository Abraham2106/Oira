import { createHash, randomBytes } from "node:crypto"
import { createServer, type IncomingMessage, type Server } from "node:http"
import { shell } from "electron"
import type {
  AuthProfile,
  AuthSessionState,
} from "../../shared/types/auth-profile"
import { DEMO_AUTH_PROFILE } from "../../shared/types/auth-profile"
import { createAppError } from "../errors/core"

/**
 * Google identity port for Login/Signup.
 * Production flow: OAuth 2.0 + PKCE (S256) via the system browser and a
 * loopback redirect (http://127.0.0.1:<ephemeral>/callback). Requires a
 * "Desktop app" OAuth client; only the Client ID is needed, never a secret.
 */
export type GoogleAuthPort = {
  signIn: () => Promise<AuthProfile>
  signOut: () => Promise<{ signedOut: true }>
  session: () => AuthSessionState
}

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000

export function resolveGoogleClientId(env: NodeJS.ProcessEnv): string | null {
  return env.OIRA_GOOGLE_CLIENT_ID?.trim() || null
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  return { verifier, challenge }
}

export function buildGoogleAuthUrl(input: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    state: input.state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

function decodeIdTokenProfile(idToken: string): AuthProfile {
  const payloadPart = idToken.split(".")[1]
  if (!payloadPart) {
    throw createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
      hint: "Malformed ID token.",
      retryable: true,
    })
  }
  let claims: Record<string, unknown>
  try {
    claims = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"))
  } catch {
    throw createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
      hint: "Undecodable ID token.",
      retryable: true,
    })
  }
  const subject = typeof claims.sub === "string" ? claims.sub : ""
  if (!subject) {
    throw createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
      hint: "ID token missing subject.",
      retryable: true,
    })
  }
  return {
    subject,
    email: typeof claims.email === "string" ? claims.email : "",
    displayName:
      typeof claims.name === "string" && claims.name.trim()
        ? claims.name.trim()
        : typeof claims.email === "string"
          ? claims.email
          : subject,
    pictureUrl: typeof claims.picture === "string" ? claims.picture : null,
  }
}

/** Starts a one-shot loopback server and resolves with the auth code. */
function startLoopback(
  expectedState: string,
): Promise<{ server: Server; port: number; result: Promise<string> }> {
  const server = createServer()
  let settle: (value: string) => void
  let fail: (error: Error) => void
  const result = new Promise<string>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  // Attach early so the rejection is not "unhandled" while sign-in wiring runs;
  // late consumers branching off `result` still observe the outcome.
  void result.catch(() => undefined)

  server.on("request", (req: IncomingMessage, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1")
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    const done = () => {
      res.end(
        "<html><body><p>Sign-in complete. You can close this window and return to oira.</p></body></html>",
      )
    }
    if (url.pathname !== "/callback") {
      res.statusCode = 404
      res.end()
      return
    }
    const providerError = url.searchParams.get("error")
    if (providerError) {
      res.statusCode = 400
      res.end("<html><body><p>Sign-in cancelled.</p></body></html>")
      fail(createAppError("OPERATION_CANCELLED", "Google sign-in cancelled.", {}))
      return
    }
    if (url.searchParams.get("state") !== expectedState) {
      res.statusCode = 400
      res.end()
      fail(createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
        hint: "State mismatch on loopback redirect.",
        retryable: false,
      }))
      return
    }
    const code = url.searchParams.get("code")
    if (!code) {
      res.statusCode = 400
      res.end()
      fail(createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
        hint: "Missing authorization code.",
        retryable: true,
      }))
      return
    }
    done()
    settle(code)
  })

  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Loopback listener failed."))
        return
      }
      resolve({ server, port: address.port, result })
    })
  })
}

async function exchangeCodeForIdToken(input: {
  clientId: string
  code: string
  codeVerifier: string
  redirectUri: string
  fetchFn: typeof fetch
}): Promise<string> {
  let response: Response
  try {
    response = await input.fetchFn(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
      }),
    })
  } catch {
    throw createAppError("INTERNAL_ERROR", "Could not reach Google.", {
      retryable: true,
    })
  }
  if (!response.ok) {
    throw createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
      hint: `Token exchange returned ${response.status}.`,
      retryable: true,
    })
  }
  const body = (await response.json()) as { id_token?: unknown }
  if (typeof body.id_token !== "string") {
    throw createAppError("INTERNAL_ERROR", "Google sign-in failed.", {
      hint: "Token response missing id_token.",
      retryable: true,
    })
  }
  return body.id_token
}

export function createGoogleOAuthPort(input: {
  clientId: string
  openExternal?: (url: string) => Promise<void>
  fetchFn?: typeof fetch
}): GoogleAuthPort {
  const openExternal = input.openExternal ?? ((url) => shell.openExternal(url))
  const fetchFn = input.fetchFn ?? fetch
  let profile: AuthProfile | null = null

  return {
    async signIn() {
      const { verifier, challenge } = createPkcePair()
      const state = randomBytes(16).toString("base64url")
      const loopback = await startLoopback(state)
      const redirectUri = `http://127.0.0.1:${loopback.port}/callback`
      try {
        await openExternal(buildGoogleAuthUrl({
          clientId: input.clientId,
          redirectUri,
          codeChallenge: challenge,
          state,
        }))
        const code = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(
              createAppError(
                "OPERATION_CANCELLED",
                "Google sign-in timed out.",
                { retryable: true },
              ),
            )
          }, SIGN_IN_TIMEOUT_MS)
          loopback.result.then(
            (value) => {
              clearTimeout(timer)
              resolve(value)
            },
            (error: Error) => {
              clearTimeout(timer)
              reject(error)
            },
          )
        })
        const idToken = await exchangeCodeForIdToken({
          clientId: input.clientId,
          code,
          codeVerifier: verifier,
          redirectUri,
          fetchFn,
        })
        profile = decodeIdTokenProfile(idToken)
        return { ...profile }
      } finally {
        loopback.server.close()
      }
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

export function createGoogleAuthPortFromEnv(
  env: NodeJS.ProcessEnv,
): GoogleAuthPort {
  const clientId = resolveGoogleClientId(env)
  if (!clientId) return createDemoGoogleAuthPort()
  return createGoogleOAuthPort({ clientId })
}
