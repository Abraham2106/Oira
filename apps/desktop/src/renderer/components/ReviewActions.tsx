import { Button } from "@notalocal/ui"

type Props = {
  canAccept: boolean
  confirmed: boolean
  onConfirmChange: (value: boolean) => void
  onAccept: () => void
}

export function ReviewActions({ canAccept, confirmed, onConfirmChange, onAccept }: Props) {
  return (
    <div className="stack">
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
