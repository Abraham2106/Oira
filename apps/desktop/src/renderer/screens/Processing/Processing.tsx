import { Card, StatusBadge } from "@oira/ui"
import type { ProductState } from "@oira/types"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  state: Extract<ProductState, "TRANSCRIBING" | "STRUCTURING">
}

export function ProcessingScreen({ state }: Props) {
  const { t } = useI18n()
  const transcribing = state === "TRANSCRIBING"

  return (
    <div className="stack page">
      <StatusBadge tone="info" icon="●" label={t("processing.badge")} live />
      <Card title={t("processing.cardTitle")}>
        <p role="status">
          {transcribing ? t("processing.transcribing") : t("processing.organizing")}
        </p>
        <ol className="process-steps">
          <li className={transcribing ? "active-step" : "done-step"}>
            <span>1</span> {t("processing.stepTranscribe")}
          </li>
          <li className={transcribing ? "" : "active-step"}>
            <span>2</span> {t("processing.stepStructure")}
          </li>
        </ol>
        <p className="muted">{t("processing.noEstimates")}</p>
      </Card>
    </div>
  )
}
