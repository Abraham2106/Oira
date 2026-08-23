import { StatusBadge } from "@oira/ui"
import type { AiEngineState } from "@oira/types"

type Props = {
  state: AiEngineState
}

const COPY: Record<AiEngineState, { tone: "ok" | "info" | "warn"; label: string }> = {
  LOCAL_INFERENCE_READY: { tone: "ok", label: "Inferencia local lista" },
  MODEL_LOADING: { tone: "info", label: "Preparando el modelo en este equipo" },
  MODEL_NOT_READY: { tone: "warn", label: "Modelo no disponible" },
}

export function ModelStatus({ state }: Props) {
  const copy = COPY[state]
  return <StatusBadge tone={copy.tone} icon="●" label={copy.label} />
}
