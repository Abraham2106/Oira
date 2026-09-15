import { useState } from "react"
import type {
  DeviceLifecycleInfo,
  ModelLifecycleEvent,
  QwenLifecycleState,
  WhisperLifecycleState,
} from "../../shared/types/model-lifecycle"
import { isQwenBusy, isWhisperBusy } from "../lib/modelEngineState"

type Props = {
  whisper: WhisperLifecycleState
  qwen: QwenLifecycleState
  whisperDevice?: DeviceLifecycleInfo
  qwenDevice?: DeviceLifecycleInfo
}

function whisperLabel(state: WhisperLifecycleState): string {
  return {
    IDLE: "En espera",
    LOADING: "Cargando",
    READY: "Cargado",
    TRANSCRIBING: "Transcribiendo",
    UNLOADING: "Descargando",
    UNLOADED: "Descargado",
    FAILED: "Error de carga",
  }[state] ?? "En espera"
}

function whisperTone(state: WhisperLifecycleState): "idle" | "loading" | "ready" | "error" {
  if (state === "LOADING" || state === "TRANSCRIBING" || state === "UNLOADING") return "loading"
  if (state === "READY") return "ready"
  if (state === "FAILED") return "error"
  return "idle"
}

export function reduceModelDebugState(
  current: Props,
  event: ModelLifecycleEvent,
): Props {
  if (event.model === "whisper") {
    return { ...current, whisper: event.state, whisperDevice: event.device }
  }
  return { ...current, qwen: event.state, qwenDevice: event.device }
}

function qwenLabel(state: QwenLifecycleState): string {
  return {
    IDLE: "En espera",
    LOADING: "Cargando",
    READY: "Listo",
    STRUCTURING: "Estructurando",
    UNLOADING: "Descargando",
    UNLOADED: "Descargado",
    FAILED: "Error de carga",
  }[state]
}

function qwenTone(state: QwenLifecycleState): "idle" | "loading" | "ready" | "error" {
  if (state === "LOADING" || state === "STRUCTURING" || state === "UNLOADING") return "loading"
  if (state === "READY") return "ready"
  if (state === "FAILED") return "error"
  return "idle"
}

export function liveHeadline(
  whisper: WhisperLifecycleState,
  qwen: QwenLifecycleState,
): { label: string; tone: "idle" | "loading" | "ready" | "error" } {
  if (isQwenBusy(qwen)) return { label: qwenLabel(qwen), tone: qwenTone(qwen) }
  if (isWhisperBusy(whisper)) return { label: whisperLabel(whisper), tone: whisperTone(whisper) }
  if (qwen === "FAILED") return { label: qwenLabel(qwen), tone: "error" }
  if (whisper === "FAILED") return { label: whisperLabel(whisper), tone: "error" }
  if (qwen === "READY") return { label: qwenLabel(qwen), tone: "ready" }
  if (whisper === "READY") return { label: whisperLabel(whisper), tone: "ready" }
  return { label: "En espera", tone: "idle" }
}

export function ModelDebugPanel({ whisper, qwen, whisperDevice, qwenDevice }: Props) {
  const [open, setOpen] = useState(false)
  const live = liveHeadline(whisper, qwen)

  if (!open) {
    return (
      <button
        type="button"
        className="model-debug-pill"
        aria-label="Estado de modelos locales"
        aria-expanded={false}
        onClick={() => setOpen(true)}
      >
        <strong className={`model-debug-status model-debug-status-${live.tone}`}>
          <i aria-hidden="true" />
          {live.label}
        </strong>
      </button>
    )
  }

  return (
    <aside className="model-debug-panel" aria-label="Estado de modelos locales">
      <div className="model-debug-head">
        <span>DEBUG</span>
        <button type="button" className="model-debug-close" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <div className="model-debug-row">
        <span>Whisper</span>
        <strong className={`model-debug-status model-debug-status-${whisperTone(whisper)}`}>
          <i aria-hidden="true" />
          {whisperLabel(whisper)}
        </strong>
      </div>
      <div className="model-debug-row">
        <span>Qwen</span>
        <strong className={`model-debug-status model-debug-status-${qwenTone(qwen)}`}>
          <i aria-hidden="true" />
          {qwenLabel(qwen)}
        </strong>
      </div>
      {whisperDevice?.requested ? (
        <div className="model-debug-row">
          <span>GPU Whisper</span>
          <small>{whisperDevice.requested}</small>
        </div>
      ) : null}
      {qwenDevice?.requested ? (
        <div className="model-debug-row">
          <span>GPU Qwen</span>
          <small>
            {qwenDevice.effective
              ? `${qwenDevice.requested} · ${qwenDevice.effective}`
              : qwenDevice.requested}
          </small>
        </div>
      ) : null}
      {qwenDevice?.fallbackReason ? (
        <div className="model-debug-row">
          <small>{qwenDevice.fallbackReason}</small>
        </div>
      ) : null}
    </aside>
  )
}
