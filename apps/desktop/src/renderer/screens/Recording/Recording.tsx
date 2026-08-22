import { useState } from "react"
import { Button, Dialog, StatusBadge } from "@notalocal/ui"
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
      <p>Hable con el paciente. Esta pista es de prototipo: no se envía audio a un servidor.</p>
      <PrivacyStatusPanel
        rows={[
          { label: "Grabación", value: "Activa en este equipo (simulada)" },
          { label: "Procesamiento", value: "Aún no" },
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
        <p>No se generará nota. En este prototipo no hay audio persistido que borrar.</p>
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
