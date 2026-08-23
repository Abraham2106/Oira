import { Card } from "@oira/ui"
import { useI18n } from "../../i18n/I18nProvider"

export function TeamScreen() {
  const { t } = useI18n()
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
