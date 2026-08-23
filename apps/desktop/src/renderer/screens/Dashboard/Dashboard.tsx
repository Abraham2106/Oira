import { Button, Card } from "@oira/ui"
import type { ProductState } from "@oira/types"
import { Icon } from "../../components/icons"
import { ModelStatus } from "../../components/ModelStatus"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  productState: ProductState
  hasDraft: boolean
  onStartNew: () => void
  onOpenNotes: () => void
  onOpenSettings: () => void
}

export function DashboardScreen({
  productState,
  hasDraft,
  onStartNew,
  onOpenNotes,
  onOpenSettings,
}: Props) {
  const { t, locale } = useI18n()
  const recordingActive = productState === "RECORDING"

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("dashboard.kicker")}</span>
          <span className="meta-dot" aria-hidden="true">
            •
          </span>
          <span className="muted">
            {new Date().toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <h1 className="page-title">{t("dashboard.pageTitle")}</h1>
        <p className="muted config-lede">{t("dashboard.lede")}</p>
      </header>

      <div className="config-grid">
        <div className="config-main">
          <div className="dash-tiles">
            <div className="dash-tile">
              <h4>{t("dashboard.sessionTile")}</h4>
              <p>{hasDraft ? t(`state.${productState}`) : t("dashboard.noActivity")}</p>
            </div>
            <div className="dash-tile">
              <h4>{t("dashboard.recordingTile")}</h4>
              <p>{recordingActive ? t("dashboard.active") : t("dashboard.inactive")}</p>
            </div>
            <div className="dash-tile">
              <h4>{t("dashboard.draftTile")}</h4>
              <p>{hasDraft ? t("dashboard.inProgress") : "—"}</p>
            </div>
            <div className="dash-tile">
              <h4>{t("dashboard.lastNoteTile")}</h4>
              <p>{productState === "EXPORTED" ? t("dashboard.exported") : "—"}</p>
            </div>
          </div>

          <div className="hub-grid">
            <button type="button" className="hub-card hub-card-primary" onClick={onStartNew}>
              <span className="hub-icon">
                <Icon name="mic" size={22} />
              </span>
              <span className="hub-body">
                <strong>{t("action.newConsult")}</strong>
                <small>{t("dashboard.newConsultDesc")}</small>
              </span>
              <span className="hub-arrow">
                <Icon name="arrow-right" />
              </span>
            </button>
            <button type="button" className="hub-card" onClick={onOpenNotes}>
              <span className="hub-icon">
                <Icon name="note" size={22} />
              </span>
              <span className="hub-body">
                <strong>{t("nav.notes")}</strong>
                <small>{t("dashboard.notesDesc")}</small>
              </span>
              <span className="hub-arrow">
                <Icon name="arrow-right" />
              </span>
            </button>
          </div>

          <Card title={t("dashboard.yourData")}>
            <p>{t("dashboard.yourDataBody")}</p>
            <div className="actions">
              <Button onClick={onOpenSettings}>{t("dashboard.privacyDetails")}</Button>
            </div>
          </Card>
        </div>

        <div className="config-side">
          <section className="nl-card status-card">
            <h2 className="config-card-title">{t("common.systemStatus")}</h2>
            <div className="status-engine">
              <ModelStatus state="LOCAL_INFERENCE_READY" />
            </div>
            <div className="status-actions">
              <Button variant="primary" onClick={onStartNew}>
                {t("action.newConsult")}
              </Button>
              <Button onClick={onOpenNotes}>{t("dashboard.goToNotes")}</Button>
            </div>
          </section>

          <aside className="tip-card">
            <h4>{t("common.clinicalTip")}</h4>
            <p>{t("dashboard.tipBody")}</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
