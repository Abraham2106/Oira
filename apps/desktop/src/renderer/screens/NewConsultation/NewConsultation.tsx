import { Button, Card } from "@oira/ui"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { useI18n } from "../../i18n/I18nProvider"
import { aiEngineStateFromModels } from "../../lib/modelEngineState"
import type { SetupStatus } from "../../../shared/types/setup"
import type { QwenLifecycleState, WhisperLifecycleState } from "../../../shared/types/model-lifecycle"

type Props = {
  label: string
  visitType: string
  informed: boolean
  setupStatus: SetupStatus | null
  modelState: { whisper: WhisperLifecycleState; qwen: QwenLifecycleState }
  onLabel: (value: string) => void
  onVisitType: (value: string) => void
  onInformed: (value: boolean) => void
  onPrepare: () => void
}

export function NewConsultationScreen({
  label,
  visitType,
  informed,
  setupStatus,
  modelState,
  onLabel,
  onVisitType,
  onInformed,
  onPrepare,
}: Props) {
  const { t } = useI18n()

  return (
    <div className="stack page">
      <ModelStatus state={aiEngineStateFromModels(modelState.whisper, modelState.qwen)} />
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
        <Button variant="primary" onClick={onPrepare} disabled={!informed}>
          {t("newConsult.prepareRecording")}
        </Button>
        <p className="muted">{t("newConsult.startHint")}</p>
      </Card>
      <Card title={t("privacy.cardTitle")}>
        <PrivacyStatusPanel
          recording="not_started"
          setupStatus={setupStatus}
          modelState={modelState}
        />
      </Card>
    </div>
  )
}
