import { useState } from "react"
import { Button, Dialog, StatusBadge } from "@oira/ui"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"
import { RecordingTimer } from "../../components/RecordingTimer"

type Props = {
  startedAtMs: number
  onStop: () => void
  onDiscard: () => void
}

export function RecordingScreen({ startedAtMs, onStop, onDiscard }: Props) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  return (
    <div className="recording-screen page">
      <div className="recording-banner" role="status">
        <StatusBadge tone="recording" icon="●" label="Grabando — micrófono activo" live />
        <RecordingTimer startedAtMs={startedAtMs} />
      </div>
      <p>Hable con naturalidad. El audio se procesa en este equipo.</p>
      <PrivacyStatusPanel
        rows={[
          { label: "Grabación", value: "Activa en este equipo" },
          { label: "Procesamiento", value: "Al detener la grabación" },
          { label: "Proveedor de IA remoto", value: "DESCONOCIDO" },
          { label: "Almacenamiento", value: "DESCONOCIDO" },
          { label: "Red", value: "DESCONOCIDO" },
        ]}
      />
      <p className="muted">Atajo: Ctrl+Enter detiene y pasa a transcribir.</p>
      <div className="actions">
        <Button variant="danger" onClick={onStop}>
          Detener grabación
        </Button>
        <Button onClick={() => setConfirmDiscard(true)}>Descartar consulta</Button>
      </div>
      <Dialog
        open={confirmDiscard}
        title="¿Descartar esta grabación?"
        onClose={() => setConfirmDiscard(false)}
      >
        <p>No se generará nota y no queda copia del audio descartado.</p>
        <div className="actions">
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDiscard(false)
              onDiscard()
            }}
          >
            Descartar
          </Button>
          <Button onClick={() => setConfirmDiscard(false)}>Seguir grabando</Button>
        </div>
      </Dialog>
    </div>
  )
}
