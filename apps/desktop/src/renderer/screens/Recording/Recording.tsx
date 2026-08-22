import { Button, StatusBadge } from "@notalocal/ui"
import { RecordingTimer } from "../../components/RecordingTimer"

type Props = {
  startedAtMs: number
  onStop: () => void
}

export function RecordingScreen({ startedAtMs, onStop }: Props) {
  return (
    <div className="recording-screen">
      <div className="recording-banner" role="status">
        <StatusBadge tone="recording" icon="●" label="Grabando — micrófono activo" live />
        <RecordingTimer startedAtMs={startedAtMs} />
      </div>
      <p>Esta pista es de prototipo. No se está enviando audio a un servidor desde esta pantalla.</p>
      <Button variant="danger" onClick={onStop}>
        Detener grabación
      </Button>
    </div>
  )
}
