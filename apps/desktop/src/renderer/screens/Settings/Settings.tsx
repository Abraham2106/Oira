import { Button, Card } from "@oira/ui"
import { LOCALES, type Locale } from "../../i18n/dictionary"
import { useI18n } from "../../i18n/I18nProvider"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"

type Props = {
  onClose: () => void
}

export function SettingsScreen({ onClose }: Props) {
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
          <ModelStatus state="LOCAL_INFERENCE_READY" />
        </div>
        <p className="muted">{t("settings.engineBody")}</p>
      </Card>

      <Card title={t("settings.statusCardTitle")}>
        <PrivacyStatusPanel
          rows={[
            { label: t("privacy.recording"), value: t("privacy.perCurrentScreen") },
            { label: t("privacy.processing"), value: t("privacy.unknown") },
            { label: t("privacy.aiRemote"), value: t("privacy.unknown") },
            { label: t("privacy.storage"), value: t("privacy.unknown") },
            { label: t("privacy.network"), value: t("privacy.unknown") },
          ]}
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
