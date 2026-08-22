import { Button, Card } from "@notalocal/ui"

type Props = {
  preview: string
  copied: boolean
  onCopy: () => Promise<void>
  onReset: () => void
}

export function ExportScreen({ preview, copied, onCopy, onReset }: Props) {
  return (
    <div className="stack page">
      <Card title="Exportar">
        <p>Vista previa. Esto es lo que se copia.</p>
        <pre className="preview">{preview}</pre>
        <Button variant="primary" onClick={() => void onCopy()}>
          Copiar al portapapeles
        </Button>
        {copied ? (
          <p role="status">Copiado. Lo que pegues en otro sistema queda fuera de NotaLocal.</p>
        ) : null}
        <Button onClick={onReset}>Nueva consulta</Button>
      </Card>
    </div>
  )
}
