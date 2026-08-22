import { Button, Card, StatusBadge } from "@notalocal/ui"

type Props = {
  preview: string
  copied: boolean
  onCopy: () => Promise<void>
  onReset: () => void
}

export function ExportScreen({ preview, copied, onCopy, onReset }: Props) {
  return (
    <div className="stack page">
      <StatusBadge tone="ok" icon="✓" label="Nota aceptada por el médico" />
      <Card title="Exportar">
        <p>Vista previa. Esto es exactamente lo que se copia.</p>
        <pre className="preview">{preview}</pre>
        <div className="actions">
          <Button variant="primary" onClick={() => void onCopy()}>
            Copiar al portapapeles
          </Button>
          <Button onClick={onReset}>Nueva consulta</Button>
        </div>
        {copied ? (
          <p role="status" className="copied">
            Copiado. Lo que pegues en otro sistema queda fuera de NotaLocal.
          </p>
        ) : (
          <p className="muted">El archivo PDF no entra en este prototipo.</p>
        )}
      </Card>
    </div>
  )
}
