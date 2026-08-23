import { Button, Card } from "@oira/ui"
import { ModelStatus } from "../../components/ModelStatus"
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
      <ModelStatus state="LOCAL_INFERENCE_READY" />
      <Card title="Nueva consulta">
        <ol className="how-steps">
          <li>Informe al paciente de que va a grabar.</li>
          <li>Grabe. No hace falta identificador.</li>
          <li>Revise el borrador. Usted acepta o corrige.</li>
        </ol>
        <p className="recording-idle">La grabación no ha comenzado.</p>
        <label className="field">
          Etiqueta opcional
          <input
            value={label}
            onChange={(event) => onLabel(event.target.value)}
            placeholder="Ej. control de rodilla"
          />
        </label>
        <label className="field">
          Tipo de consulta (opcional)
          <input
            value={visitType}
            onChange={(event) => onVisitType(event.target.value)}
            placeholder="Ej. seguimiento"
          />
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
        <p className="muted">El botón se habilita al marcar el aviso al paciente.</p>
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
