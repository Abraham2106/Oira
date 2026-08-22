import { Button, Card, StatusBadge } from "@notalocal/ui"
import { PrivacyStatusPanel } from "../../components/PrivacyStatusPanel"

type Props = {
  label: string
  visitType: string
  informed: boolean
  onLabel: (value: string) => void
  onVisitType: (value: string) => void
  onInformed: (value: boolean) => void
  onStart: () => void
}

export function NewConsultationScreen({
  label,
  visitType,
  informed,
  onLabel,
  onVisitType,
  onInformed,
  onStart,
}: Props) {
  return (
    <div className="stack page">
      <StatusBadge tone="ok" icon="●" label="Inferencia local lista" />
      <Card title="Nueva consulta">
        <p>La grabación no ha comenzado.</p>
        <label className="field">
          Etiqueta opcional
          <input value={label} onChange={(event) => onLabel(event.target.value)} />
        </label>
        <label className="field">
          Tipo de consulta (opcional)
          <input value={visitType} onChange={(event) => onVisitType(event.target.value)} />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={informed}
            onChange={(event) => onInformed(event.target.checked)}
          />
          Confirmé que informé al paciente de la grabación. Esto no es un documento legal.
        </label>
        <Button variant="primary" onClick={onStart} disabled={!informed}>
          Comenzar grabación
        </Button>
        <p className="muted">Puedes empezar sin etiqueta ni identificador de paciente.</p>
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
