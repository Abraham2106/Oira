import { Card, StatusBadge } from "@oira/ui"
import type { ProductState, TranscriptSegment } from "@oira/types"
import { useI18n } from "../../i18n/I18nProvider"
import { ProgressiveTranscript } from "../../components/ProgressiveTranscript"

type Props = {
  state: Extract<ProductState, "TRANSCRIBING" | "STRUCTURING">
  transcript?: TranscriptSegment[]
  failed?: boolean
  reviewing?: boolean
}

export function ProcessingScreen({ state, transcript = [], failed = false, reviewing = false }: Props) {
  const { t } = useI18n()
  const transcribing = state === "TRANSCRIBING"

  return (
    <div className="stack page">
      <StatusBadge tone="info" icon="●" label={t("processing.badge")} live />
      <Card title={t("processing.cardTitle")}>
        <p role="status">
          {failed
            ? t("processing.structuringFailed")
            : transcribing
              ? t("processing.transcribing")
              : reviewing
                ? t("processing.reviewing")
                : t("processing.organizing")}
        </p>
        <ol className="process-steps">
          <li className={transcribing ? "active-step" : "done-step"}>
            <span>1</span> {t("processing.stepTranscribe")}
          </li>
          <li className={transcribing ? "" : reviewing ? "done-step" : "active-step"}>
            <span>2</span> {t("processing.stepStructure")}
          </li>
          <li className={reviewing ? "active-step" : ""}>
            <span>3</span> {t("processing.stepReview")}
          </li>
        </ol>
        <p className="muted">{t("processing.noEstimates")}</p>
        {state === "STRUCTURING" && transcript.length > 0 ? (
          <section aria-label={t("processing.transcriptHeading")} className="transcript-card">
            <h3>{t("processing.transcriptHeading")}</h3>
            <ProgressiveTranscript segments={transcript} immediate={failed} />
          </section>
        ) : null}
      </Card>
    </div>
  )
}
