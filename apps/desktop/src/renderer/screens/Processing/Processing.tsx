import { Card, StatusBadge } from "@notalocal/ui"
import type { ProductState } from "@notalocal/types"

type Props = {
  state: Extract<ProductState, "TRANSCRIBING" | "STRUCTURING">
}

export function ProcessingScreen({ state }: Props) {
  const transcribing = state === "TRANSCRIBING"

  return (
    <div className="stack page">
      <StatusBadge tone="info" icon="●" label="Borrador en preparación · en este equipo" live />
      <Card title="Procesando">
        <p role="status">
          {transcribing
            ? "Transcribiendo la consulta en este equipo."
            : "Organizando la nota."}
        </p>
        <ol className="process-steps">
          <li className={transcribing ? "active-step" : "done-step"}>
            <span>1</span> Transcripción
          </li>
          <li className={transcribing ? "" : "active-step"}>
            <span>2</span> Estructuración
          </li>
        </ol>
        <p className="muted">Sin porcentajes ni tiempos estimados: el prototipo no los mide.</p>
      </Card>
    </div>
  )
}
