import { StatusBadge } from "@oira/ui"
import type { AiEngineState } from "@oira/types"
import { useI18n } from "../i18n/I18nProvider"

type Props = {
  state: AiEngineState
}

const COPY: Record<AiEngineState, { tone: "ok" | "info" | "warn"; key: string }> = {
  LOCAL_INFERENCE_READY: { tone: "ok", key: "modelStatus.ready" },
  MODEL_LOADING: { tone: "info", key: "modelStatus.loading" },
  MODEL_NOT_READY: { tone: "warn", key: "modelStatus.notReady" },
}

export function ModelStatus({ state }: Props) {
  const { t } = useI18n()
  const copy = COPY[state]
  return <StatusBadge tone={copy.tone} icon="●" label={t(copy.key)} />
}
