import { Button, Card } from "@notalocal/ui"
import { ModelStatus } from "../../components/ModelStatus"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"

type Props = {
  onContinue: () => void
  onOpenSettings: () => void
}

export function DeviceReadyScreen({ onContinue, onOpenSettings }: Props) {
  return (
    <div className="stack page">
      <ModelStatus state="LOCAL_INFERENCE_READY" />
      <Card title="Equipo listo">
        <p>
          Confirme esto antes de que entre el paciente. En este prototipo la inferencia es un puente
          mock: no hay captura real de micrófono ni modelo QVAC.
        </p>
        <ul className="ready-list">
          <li>Grabación: aún no ha comenzado.</li>
          <li>Procesamiento: se simula en este equipo.</li>
          <li>La nota será un borrador. Usted decide si se acepta.</li>
        </ul>
        <div className="actions">
          <Button variant="primary" onClick={onContinue}>
            Nueva consulta
          </Button>
          <Button onClick={onOpenSettings}>Privacidad y atajos</Button>
        </div>
      </Card>
      <Card title="Privacidad (estado actual)">
        <PrivacyStatusPanel
          rows={[
            { label: "Grabación", value: "No ha comenzado" },
            { label: "Procesamiento", value: "DESCONOCIDO" },
            { label: "Proveedor de IA remoto", value: "DESCONOCIDO" },
            { label: "Almacenamiento", value: "DESCONOCIDO" },
            { label: "Red", value: "DESCONOCIDO" },
          ]}
        />
      </Card>
    </div>
  )
}
