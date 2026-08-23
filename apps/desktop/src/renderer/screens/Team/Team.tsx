import { Button, Card } from "@oira/ui"
import type { AuthProfile } from "../../../shared/types/auth-profile"
import { getBridge } from "../../bridge/oira"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  profile: AuthProfile | null
  onSignedOut: () => void
}

export function TeamScreen({ profile, onSignedOut }: Props) {
  const bridge = getBridge()
  const { t } = useI18n()

  async function handleSignOut() {
    await bridge.signOut().catch(() => undefined)
    onSignedOut()
  }

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("team.kicker")}</span>
        </div>
        <h1 className="page-title">{t("team.pageTitle")}</h1>
        <p className="muted config-lede">{t("team.lede")}</p>
      </header>

      <Card title={t("team.currentSession")}>
        {profile ? (
          <p className="muted">
            {t("team.signedInAs")}: {profile.displayName} ({profile.email})
          </p>
        ) : null}
        <dl className="privacy">
          <div className="privacy-row">
            <dt>{t("team.professionalDt")}</dt>
            <dd>{t("team.professionalDd")}</dd>
          </div>
          <div className="privacy-row">
            <dt>{t("team.roleDt")}</dt>
            <dd>{t("team.roleDd")}</dd>
          </div>
          <div className="privacy-row">
            <dt>{t("team.authorizationDt")}</dt>
            <dd>{t("team.authorizationDd")}</dd>
          </div>
        </dl>
        <Button onClick={() => void handleSignOut()}>{t("team.signOut")}</Button>
      </Card>

      <Card title={t("team.whoDoesWhat")}>
        <ol className="how-steps">
          <li>{t("team.stepAiDraft")}</li>
          <li>{t("team.stepPhysicianReviews")}</li>
          <li>{t("team.stepOnlyPhysicianExports")}</li>
        </ol>
      </Card>

      <aside className="tip-card">
        <h4>{t("team.principleTitle")}</h4>
        <p>{t("team.principleBody")}</p>
      </aside>
    </div>
  )
}
