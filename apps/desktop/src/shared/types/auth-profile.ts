export type AuthProfile = {
  /** Stable Google account id (OIDC `sub`). */
  subject: string
  email: string
  displayName: string
  pictureUrl: string | null
}

export type AuthSessionState = {
  authenticated: boolean
  profile: AuthProfile | null
}

/** Synthetic demo identity — never a real account. */
export const DEMO_AUTH_PROFILE: AuthProfile = {
  subject: "000000000000000000000",
  email: "demo.physician@example.com",
  displayName: "Demo Physician",
  pictureUrl: null,
}
