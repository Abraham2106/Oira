import { useState } from "react"
import { Button, Dialog, StatusBadge } from "@oira/ui"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { RecordingTimer } from "../../components/RecordingTimer"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  startedAtMs: number
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ startedAtMs, onStop, onDiscard }: Props) {
  const { t } = useI18n()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  return (
    <div className="recording-screen page">
      <div className="recording-banner" role="status">
        <StatusBadge tone="recording" icon="●" label={t("recording.badge")} live />
        <RecordingTimer startedAtMs={startedAtMs} />
      </div>
      <p>{t("recording.speakNaturally")}</p>
      <PrivacyStatusPanel
        rows={[
          { label: t("privacy.recording"), value: t("recording.activeHere") },
          { label: t("privacy.processing"), value: t("privacy.whenRecordingStops") },
          { label: t("privacy.aiRemote"), value: t("privacy.unknown") },
          { label: t("privacy.storage"), value: t("privacy.unknown") },
          { label: t("privacy.network"), value: t("privacy.unknown") },
        ]}
      />
      <p className="muted">{t("recording.shortcutHint")}</p>
      <div className="actions">
        <Button variant="danger" onClick={onStop}>
          {t("recording.stopButton")}
        </Button>
        <Button onClick={() => setConfirmDiscard(true)}>{t("recording.discard")}</Button>
      </div>
      <Dialog
        open={confirmDiscard}
        title={t("recording.discardTitle")}
        onClose={() => setConfirmDiscard(false)}
      >
        <p>{t("recording.discardBody")}</p>
        <div className="actions">
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDiscard(false)
              onDiscard()
            }}
          >
            {t("recording.discardConfirm")}
          </Button>
          <Button onClick={() => setConfirmDiscard(false)}>{t("recording.keepRecording")}</Button>
        </div>
      </Dialog>
    </div>
  )
}
