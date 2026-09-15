import { Button } from "@oira/ui"
import { useI18n } from "../../i18n/I18nProvider"

export type SetupPhase =
  | "checking"
  | "blocked"
  | "ready_to_download"
  | "downloading"
  | "verifying"
  | "error"
  | "ready"

export type SetupFactStatus = "checking" | "verified" | "unknown" | "blocked"

export type SetupFact = {
  id: "operatingSystem" | "memory" | "storage" | "network" | "signature"
  status: SetupFactStatus
  detail?: string
}

export type SetupModel = {
  id: "whisper" | "qwen"
  status: "pending" | "downloading" | "verifying" | "ready" | "error"
  downloadedBytes?: number
  totalBytes?: number
  detail?: string
}

type Props = {
  phase: SetupPhase
  checks: SetupFact[]
  models: SetupModel[]
  message?: string
  onPrimary: () => void
  onExit: () => void
}

const FACT_KEYS: Record<SetupFact["id"], string> = {
  operatingSystem: "modelSetup.fact.operatingSystem",
  memory: "modelSetup.fact.memory",
  storage: "modelSetup.fact.storage",
  network: "modelSetup.fact.network",
  signature: "modelSetup.fact.signature",
}

const MODEL_KEYS: Record<SetupModel["id"], string> = {
  whisper: "modelSetup.model.whisper",
  qwen: "modelSetup.model.qwen",
}

export function primaryActionKey(phase: SetupPhase): string {
  if (phase === "blocked") return "modelSetup.action.checkAgain"
  if (phase === "error") return "modelSetup.action.retry"
  if (phase === "ready") return "modelSetup.action.continue"
  if (phase === "ready_to_download") return "modelSetup.action.download"
  return "modelSetup.action.working"
}

export function progressPercent(model: SetupModel): number | null {
  if (!model.totalBytes || model.downloadedBytes === undefined) return null
  return Math.min(100, Math.max(0, Math.round((model.downloadedBytes / model.totalBytes) * 100)))
}

function FactRow({ fact }: { fact: SetupFact }) {
  const { t } = useI18n()
  return (
    <li className="model-setup-row">
      <div>
        <strong>{t(FACT_KEYS[fact.id])}</strong>
        <p>{fact.detail ?? t("modelSetup.detail.unknown")}</p>
      </div>
      <span className={`setup-state setup-state-${fact.status}`}>
        <span aria-hidden="true" />
        {t(`modelSetup.status.${fact.status}`)}
      </span>
    </li>
  )
}

function ModelRow({ model }: { model: SetupModel }) {
  const { t } = useI18n()
  const percent = progressPercent(model)
  return (
    <li className="model-setup-row model-download-row">
      <div className="model-download-body">
        <div className="model-download-copy">
          <strong>{t(MODEL_KEYS[model.id])}</strong>
          <p>{model.detail ?? t(`modelSetup.model.${model.id}Detail`)}</p>
        </div>
        {model.status === "downloading" ? (
          <div className="model-download-progress">
            <progress
              aria-label={t(MODEL_KEYS[model.id])}
              max={model.totalBytes}
              value={model.downloadedBytes}
            />
            <span>{percent === null ? t("modelSetup.progress.active") : `${percent}%`}</span>
          </div>
        ) : null}
      </div>
      <span className={`setup-state setup-state-${model.status}`}>
        <span aria-hidden="true" />
        {t(`modelSetup.status.${model.status}`)}
      </span>
    </li>
  )
}

export function ModelSetupScreen({ phase, checks, models, message, onPrimary, onExit }: Props) {
  const { t } = useI18n()
  const busy = phase === "checking" || phase === "downloading" || phase === "verifying"
  const equipment = checks.filter((fact) => fact.id !== "signature")
  const signature = checks.find((fact) => fact.id === "signature")

  return (
    <main className="model-setup-page" aria-labelledby="model-setup-title">
      <header className="model-setup-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("modelSetup.kicker")}</span>
          <span className="meta-dot" aria-hidden="true">·</span>
          <span>{t("modelSetup.firstRun")}</span>
        </div>
        <h1 id="model-setup-title" className="page-title">{t("modelSetup.title")}</h1>
        <p className="muted model-setup-lede">{t("modelSetup.lede")}</p>
      </header>

      <div className="model-setup-panel">
        <section className="model-setup-section" aria-labelledby="setup-equipment-title">
          <div className="model-setup-section-heading">
            <span aria-hidden="true">1</span>
            <div>
              <h2 id="setup-equipment-title">{t("modelSetup.equipmentTitle")}</h2>
              <p>{t("modelSetup.equipmentBody")}</p>
            </div>
          </div>
          <ul>{equipment.map((fact) => <FactRow key={fact.id} fact={fact} />)}</ul>
        </section>

        <section className="model-setup-section" aria-labelledby="setup-models-title">
          <div className="model-setup-section-heading">
            <span aria-hidden="true">2</span>
            <div>
              <h2 id="setup-models-title">{t("modelSetup.modelsTitle")}</h2>
              <p>{t("modelSetup.modelsBody")}</p>
            </div>
          </div>
          <ul>{models.map((model) => <ModelRow key={model.id} model={model} />)}</ul>
        </section>

        <section className="model-setup-section" aria-labelledby="setup-security-title">
          <div className="model-setup-section-heading">
            <span aria-hidden="true">3</span>
            <div>
              <h2 id="setup-security-title">{t("modelSetup.securityTitle")}</h2>
              <p>{t("modelSetup.securityBody")}</p>
            </div>
          </div>
          <ul>
            {signature ? <FactRow fact={signature} /> : null}
            <li className="model-setup-row">
              <div>
                <strong>{t("modelSetup.integrityTitle")}</strong>
                <p>{t("modelSetup.integrityBody")}</p>
              </div>
              <span className="setup-state setup-state-unknown">
                <span aria-hidden="true" />
                {t("modelSetup.status.unknown")}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <footer className="model-setup-footer">
        <p className={phase === "error" || phase === "blocked" ? "model-setup-message model-setup-message-alert" : "model-setup-message"} role={phase === "error" ? "alert" : "status"} aria-live="polite">
          {message ?? t(`modelSetup.phase.${phase}`)}
        </p>
        <div className="model-setup-actions">
          <Button onClick={onExit}>{t("modelSetup.action.exit")}</Button>
          <Button variant="primary" disabled={busy} aria-busy={busy} onClick={onPrimary}>
            {t(primaryActionKey(phase))}
          </Button>
        </div>
      </footer>
    </main>
  )
}
