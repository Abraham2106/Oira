import { Card, StatusBadge } from "@notalocal/ui"
import type { ProductState } from "@notalocal/types"

type Props = {
  state: Extract<ProductState, "TRANSCRIBING" | "STRUCTURING">
}

export function ProcessingScreen({ state }: Props) {
  const copy =
    state === "TRANSCRIBING"
      ? "Transcribiendo la consulta en este equipo."
      : "Organizando la nota."

  return (
    <div className="stack page">
      <StatusBadge tone="info" icon="●" label="Borrador en preparación" live />
      <Card title="Procesando">
        <p role="status">{copy}</p>
        <ol>
          <li className={state === "TRANSCRIBING" ? "active-step" : ""}>Transcripción</li>
          <li className={state === "STRUCTURING" ? "active-step" : ""}>Estructuración</li>
        </ol>
      </Card>
    </div>
  )
}
