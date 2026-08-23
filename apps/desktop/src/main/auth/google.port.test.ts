import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  buildGoogleAuthUrl,
  createDemoGoogleAuthPort,
  createGoogleAuthPortFromEnv,
  createGoogleOAuthPort,
  createPkcePair,
} from "./google.port"

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function fakeIdToken(claims: Record<string, unknown>): string {
  return `${b64urlJson({ alg: "RS256", typ: "JWT" })}.${b64urlJson(claims)}.sig`
}

describe("pkce pair", () => {
  it("derives the challenge as base64url(sha256(verifier))", () => {
    const { verifier, challenge } = createPkcePair()
    const expected = createHash("sha256").update(verifier).digest("base64url")
    expect(challenge).toBe(expected)
    expect(verifier.length).toBeGreaterThan(40)
  })
})

describe("buildGoogleAuthUrl", () => {
  it("encodes an S256 PKCE authorization request", () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: "cid",
        redirectUri: "http://127.0.0.1:5/cb",
        codeChallenge: "cc",
        state: "st",
      }),
    )
    expect(url.origin).toBe("https://accounts.google.com")
    expect(url.searchParams.get("client_id")).toBe("cid")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("code_challenge")).toBe("cc")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("scope")).toBe("openid email profile")
    expect(url.searchParams.get("state")).toBe("st")
  })
})

describe("createGoogleOAuthPort", () => {
  function makeTokenFetcher(idToken: string): typeof fetch {
    return (async () =>
      new Response(JSON.stringify({ id_token: idToken }), {
        status: 200,
      })) as unknown as typeof fetch
  }

  async function completeLoopback(authUrl: string, search: string) {
    const url = new URL(authUrl)
    const redirectUri = url.searchParams.get("redirect_uri") ?? ""
    const port = new URL(redirectUri).port
    await fetch(`http://127.0.0.1:${port}/callback?${search}`)
  }

  it("signs in through the loopback redirect and maps ID token claims", async () => {
    let authUrlValue = ""
    const port = createGoogleOAuthPort({
      clientId: "cid",
      openExternal: async (authUrl) => {
        authUrlValue = authUrl
        await completeLoopback(
          authUrl,
          `code=abc&state=${new URL(authUrl).searchParams.get("state")}`,
        )
      },
      fetchFn: makeTokenFetcher(
        fakeIdToken({ sub: "s1", email: "ana@example.com", name: "Ana" }),
      ),
    })

    const profile = await port.signIn()
    expect(new URL(authUrlValue).hostname).toBeTruthy()
    expect(profile).toEqual({
      subject: "s1",
      email: "ana@example.com",
      displayName: "Ana",
      pictureUrl: null,
    })
    expect(port.session()).toEqual({
      authenticated: true,
      profile: { ...profile },
    })
    expect(await port.signOut()).toEqual({ signedOut: true })
    expect(port.session().authenticated).toBe(false)
  })

  it("rejects on state mismatch", async () => {
    const port = createGoogleOAuthPort({
      clientId: "cid",
      openExternal: async (authUrl) => {
        await completeLoopback(authUrl, "code=abc&state=tampered")
      },
      fetchFn: makeTokenFetcher(fakeIdToken({ sub: "s1" })),
    })
    await expect(port.signIn()).rejects.toMatchObject({
      name: "OiraAppError",
    })
  })

  it("maps provider cancellation to OPERATION_CANCELLED", async () => {
    const port = createGoogleOAuthPort({
      clientId: "cid",
      openExternal: async (authUrl) => {
        await completeLoopback(authUrl, "error=access_denied")
      },
      fetchFn: makeTokenFetcher(fakeIdToken({ sub: "s1" })),
    })
    await expect(port.signIn()).rejects.toMatchObject({
      code: "OPERATION_CANCELLED",
    })
  })

  it("falls back to the deterministic demo port when no client id is set", async () => {
    const demo = createGoogleAuthPortFromEnv({})
    const profile = await demo.signIn()
    expect(profile.email).toContain("@example.com")
    expect(createDemoGoogleAuthPort().session().authenticated).toBe(false)
  })
})
