import type { QwenLifecycleState, WhisperLifecycleState } from "../../shared/types/model-lifecycle"
import type { SetupStatus } from "../../shared/types/setup"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  recording: "not_started" | "active" | "depends_on_screen"
  setupStatus: SetupStatus | null
  modelState: {
    whisper: WhisperLifecycleState
    qwen: QwenLifecycleState
  }
}

function processingValue(
  setupStatus: SetupStatus | null,
  modelState: Props["modelState"],
  t: (key: string) => string,
): string {
  if (modelState.whisper === "TRANSCRIBING") return t("privacy.processingTranscribing")
  if (modelState.qwen === "STRUCTURING") return t("privacy.processingStructuring")
  if (modelState.whisper === "LOADING" || modelState.whisper === "UNLOADING" || modelState.qwen === "LOADING" || modelState.qwen === "UNLOADING") {
    return t("privacy.processingPreparing")
  }
  if (modelState.whisper === "FAILED" || modelState.qwen === "FAILED") return t("privacy.processingUnavailable")
  if (setupStatus?.ready && setupStatus.runtime.inference === "local") return t("privacy.processingReady")
  return t("privacy.processingPreparing")
}

export function PrivacyStatusPanel({ recording, setupStatus, modelState }: Props) {
  const { t } = useI18n()
  const storage = setupStatus?.checks.find((check) => check.id === "storage")
  const rows = [
    { label: t("privacy.recording"), value: t(`privacy.recording.${recording}`) },
    { label: t("privacy.processing"), value: processingValue(setupStatus, modelState, t) },
    {
      label: t("privacy.aiRemote"),
      value: setupStatus?.runtime.remoteAiProvider === "none"
        ? t("privacy.remoteNone")
        : t("privacy.backendPending"),
    },
    {
      label: t("privacy.storage"),
      value: storage?.status === "verified"
        ? t("privacy.storageVerified")
        : storage?.status === "blocked"
          ? t("privacy.storageBlocked")
          : t("privacy.storageChecking"),
    },
    {
      label: t("privacy.network"),
      value: setupStatus?.runtime.networkUsage === "model_downloads_only"
        ? t("privacy.networkModelsOnly")
        : t("privacy.backendPending"),
    },
  ]

  return (
    <dl className="privacy">
      {rows.map((row) => (
        <div key={row.label} className="privacy-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
