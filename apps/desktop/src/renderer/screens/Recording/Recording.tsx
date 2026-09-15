import { useState } from "react"
import { Button, Dialog, StatusBadge } from "@oira/ui"
import { Icon } from "../../components/icons"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { RecordingTimer } from "../../components/RecordingTimer"
import { useI18n } from "../../i18n/I18nProvider"
import { aiEngineStateFromModels } from "../../lib/modelEngineState"
import type { SetupStatus } from "../../../shared/types/setup"
import type { QwenLifecycleState, WhisperLifecycleState } from "../../../shared/types/model-lifecycle"

type Props = {
  isRecording: boolean
  starting?: boolean
  startedAtMs?: number
  setupStatus: SetupStatus | null
  modelState: { whisper: WhisperLifecycleState; qwen: QwenLifecycleState }
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ isRecording, starting = false, startedAtMs, setupStatus, modelState, onStart, onStop, onDiscard }: Props) {
  const { t } = useI18n()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  return (
    <div className="recording-screen page">
      <ModelStatus state={aiEngineStateFromModels(modelState.whisper, modelState.qwen)} />
      <div className="recording-banner" role="status">
        <StatusBadge
          tone={isRecording ? "recording" : "neutral"}
          icon={isRecording ? "●" : "○"}
          label={isRecording ? t("recording.badge") : t("recording.readyBadge")}
          live={isRecording}
        />
        {isRecording && startedAtMs ? <RecordingTimer startedAtMs={startedAtMs} /> : null}
      </div>
      <p>{isRecording ? t("recording.speakNaturally") : t("recording.readyBody")}</p>
      <PrivacyStatusPanel
        recording={isRecording ? "active" : "not_started"}
        setupStatus={setupStatus}
        modelState={modelState}
      />
      {isRecording ? <p className="muted">{t("recording.shortcutHint")}</p> : null}
      <div className="actions">
        {isRecording ? (
          <Button variant="danger" onClick={onStop}>
            {t("recording.stopButton")}
          </Button>
        ) : (
          <Button variant="primary" disabled={starting} onClick={onStart}>
            <Icon name="mic" size={18} />
            {starting ? t("recording.starting") : t("recording.startButton")}
          </Button>
        )}
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
