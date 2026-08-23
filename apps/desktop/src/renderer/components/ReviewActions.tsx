import { Button } from "@oira/ui"

type Props = {
  canAccept: boolean
  confirmed: boolean
  remaining: number
  onConfirmChange: (value: boolean) => void
  onAccept: () => void
}

export function ReviewActions({
  canAccept,
  confirmed,
  remaining,
  onConfirmChange,
  onAccept,
}: Props) {
  return (
    <div className="review-dock-inner">
      <p className="muted">
        {remaining === 0
          ? "Marcó todas las secciones. Aún debe confirmar la nota completa."
          : `${remaining} sección${remaining === 1 ? "" : "es"} sin marcar como revisada${remaining === 1 ? "" : "s"}. Puede aceptar igual: es su decisión.`}
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
        />
        Al aceptar, confirmas que revisaste esta nota.
      </label>
      <Button variant="primary" disabled={!canAccept} onClick={onAccept}>
        Aceptar borrador
      </Button>
    </div>
  )
}
