import { useState } from "react"
import { Button, Card } from "@oira/ui"
import type { AuthProfile } from "../../../shared/types/auth-profile"
import { getBridge } from "../../bridge/oira"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  onSignedIn: (profile: AuthProfile) => void
}

type Mode = "signin" | "signup"

export function LoginScreen({ onSignedIn }: Props) {
  const bridge = getBridge()
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>("signin")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    setBusy(true)
    setError(null)
    try {
      const profile = await bridge.googleSignIn()
      onSignedIn(profile)
    } catch {
      setError(t("login.errorGeneric"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack page auth-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("login.kicker")}</span>
        </div>
        <h1 className="page-title">
          {mode === "signin" ? t("login.signinTitle") : t("login.signupTitle")}
        </h1>
        <p className="muted">{t("login.subtitle")}</p>
      </header>

      <Card title={mode === "signin" ? t("login.signinTitle") : t("login.signupTitle")}>
        <Button variant="primary" disabled={busy} onClick={() => void handleGoogle()}>
          {busy ? t("login.googleBusy") : t("login.googleCta")}
        </Button>

        <p className="muted auth-divider">{t("login.or")}</p>

        <label className="field-label" htmlFor="auth-email">
          {t("login.emailLabel")}
        </label>
        <input id="auth-email" type="email" autoComplete="email" disabled />

        <label className="field-label" htmlFor="auth-password">
          {t("login.passwordLabel")}
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          disabled
        />

        <Button disabled>{mode === "signin" ? t("login.emailSigninCta") : t("login.emailSignupCta")}</Button>
        <p className="muted check-compact">{t("login.emailComingSoon")}</p>

        <button
          type="button"
          className="linkish"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? t("login.toSignup") : t("login.toSignin")}
        </button>

        {error ? (
          <p role="alert" className="muted">
            {error}
          </p>
        ) : null}
      </Card>

      <p className="muted">{t("login.privacyNote")}</p>
    </div>
  )
}
