import { Button, Card } from "@oira/ui"
import { LOCALES, type Locale } from "../../i18n/dictionary"
import { useI18n } from "../../i18n/I18nProvider"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import type { SetupStatus } from "../../../shared/types/setup"
import type { QwenLifecycleState, WhisperLifecycleState } from "../../../shared/types/model-lifecycle"
import { aiEngineStateFromModels } from "../../lib/modelEngineState"

type Props = {
  onClose: () => void
  onOpenModelSetup: () => void
  setupStatus: SetupStatus | null
  modelState: { whisper: WhisperLifecycleState; qwen: QwenLifecycleState }
}

export function SettingsScreen({ onClose, onOpenModelSetup, setupStatus, modelState }: Props) {
  const { t, locale, setLocale } = useI18n()
  return (
    <div className="stack page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("settings.kicker")}</span>
        </div>
        <h1 className="page-title">{t("settings.pageTitle")}</h1>
      </header>

      <Card title={t("settings.languageCardTitle")}>
        <div
          className="language-options"
          role="radiogroup"
          aria-label={t("settings.languageAria")}
        >
          {LOCALES.map((option: Locale) => (
            <label key={option} className="language-option">
              <input
                type="radio"
                name="app-language"
                value={option}
                checked={locale === option}
                onChange={() => setLocale(option)}
              />
              <span>{t(`settings.language.${option}`)}</span>
            </label>
          ))}
        </div>
        <p className="muted">{t("settings.languageHint")}</p>
      </Card>

      <Card title={t("settings.engineCardTitle")}>
        <div className="status-engine">
          <ModelStatus state={aiEngineStateFromModels(modelState.whisper, modelState.qwen)} />
        </div>
        <p className="muted">{t("settings.engineBody")}</p>
        <Button onClick={onOpenModelSetup}>{t("settings.modelSetupButton")}</Button>
      </Card>

      <Card title={t("settings.statusCardTitle")}>
        <PrivacyStatusPanel
          recording="depends_on_screen"
          setupStatus={setupStatus}
          modelState={modelState}
        />
        <p className="muted">{t("settings.statusBody")}</p>
      </Card>

      <Card title={t("settings.retentionCardTitle")}>
        <p>{t("settings.retentionBody")}</p>
        <Button disabled>{t("settings.retentionButton")}</Button>
        <p className="muted check-compact">{t("settings.retentionHint")}</p>
      </Card>

      <Card title={t("settings.shortcutsCardTitle")}>
        <ul className="shortcut-list">
          <li>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> {t("settings.shortcutCtrlEnter")}
          </li>
          <li>
            <kbd>Esc</kbd> {t("settings.shortcutEsc")}
          </li>
          <li>
            <kbd>?</kbd> {t("settings.shortcutQuestion")}
          </li>
        </ul>
      </Card>

      <div className="actions">
        <Button onClick={onClose}>{t("settings.back")}</Button>
      </div>
    </div>
  )
}
