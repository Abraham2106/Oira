import { Button, Card } from "@oira/ui"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  label: string
  visitType: string
  informed: boolean
  onLabel: (value: string) => void
  onVisitType: (value: string) => void
  onInformed: (value: boolean) => void
  onStart: () => void
}

export function NewConsultationScreen({
  label,
  visitType,
  informed,
  onLabel,
  onVisitType,
  onInformed,
  onStart,
}: Props) {
  const { t } = useI18n()

  return (
    <div className="stack page">
      <ModelStatus state="LOCAL_INFERENCE_READY" />
      <Card title={t("newConsult.cardTitle")}>
        <ol className="how-steps">
          <li>{t("newConsult.stepInform")}</li>
          <li>{t("newConsult.stepRecord")}</li>
          <li>{t("newConsult.stepReview")}</li>
        </ol>
        <p className="recording-idle">{t("newConsult.idleHint")}</p>
        <label className="field">
          {t("newConsult.labelField")}
          <input
            value={label}
            onChange={(event) => onLabel(event.target.value)}
            placeholder={t("newConsult.titlePlaceholder")}
          />
        </label>
        <label className="field">
          {t("newConsult.typeLabel")}
          <input
            value={visitType}
            onChange={(event) => onVisitType(event.target.value)}
            placeholder={t("newConsult.typePlaceholder")}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={informed}
            onChange={(event) => onInformed(event.target.checked)}
          />
          {t("newConsult.consentLabel")}
        </label>
        <Button variant="primary" onClick={onStart} disabled={!informed}>
          {t("newConsult.startRecording")}
        </Button>
        <p className="muted">{t("newConsult.startHint")}</p>
      </Card>
      <Card title={t("privacy.cardTitle")}>
        <PrivacyStatusPanel
          rows={[
            { label: t("privacy.recording"), value: t("privacy.notStarted") },
            { label: t("privacy.processing"), value: t("privacy.unknown") },
            { label: t("privacy.aiRemote"), value: t("privacy.unknown") },
            { label: t("privacy.storage"), value: t("privacy.unknown") },
            { label: t("privacy.network"), value: t("privacy.unknown") },
          ]}
        />
      </Card>
    </div>
  )
}
