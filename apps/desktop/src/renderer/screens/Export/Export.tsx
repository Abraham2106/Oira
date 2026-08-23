import { useMemo, useState } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import { SECTION_TITLES } from "@oira/types"

const TITLE_LINES: ReadonlySet<string> = new Set(Object.values(SECTION_TITLES))

export type ExportFormat = "sections" | "plain"

/**
 * Quita las líneas cuyo contenido es exactamente un título de sección y
 * colapsa los saltos sobrantes para que los párrafos queden separados por
 * una línea en blanco. El texto no cambia en nada más.
 */
export function toPlainText(preview: string): string {
  const withoutTitles = preview.split("\n").filter((line) => !TITLE_LINES.has(line))
  return withoutTitles.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

type Props = {
  preview: string
  copied: boolean
  onCopy: (text: string) => Promise<void>
  onReset: () => void
}

export function ExportScreen({ preview, copied, onCopy, onReset }: Props) {
  const [format, setFormat] = useState<ExportFormat>("sections")
  const plain = useMemo(() => toPlainText(preview), [preview])
  const shown = format === "sections" ? preview : plain

  return (
    <div className="stack page">
      <StatusBadge tone="ok" icon="✓" label="Nota aceptada por el médico" />
      <Card title="Exportar">
        <p>Elige el formato. La vista previa es exactamente lo que se copia.</p>
        <div className="format-options" role="radiogroup" aria-label="Formato de exportación">
          <label className="format-option">
            <input
              type="radio"
              name="nl-export-format"
              value="sections"
              checked={format === "sections"}
              onChange={() => setFormat("sections")}
            />
            <span className="format-option-text">
              Con títulos de sección
              <span className="format-option-hint">Las 7 secciones con su encabezado.</span>
            </span>
          </label>
          <label className="format-option">
            <input
              type="radio"
              name="nl-export-format"
              value="plain"
              checked={format === "plain"}
              onChange={() => setFormat("plain")}
            />
            <span className="format-option-text">
              Texto corrido
              <span className="format-option-hint">
                Mismo contenido sin las líneas de título; párrafos separados por una línea en
                blanco.
              </span>
            </span>
          </label>
        </div>
        <pre className="preview">{shown}</pre>
        <div className="actions">
          <Button variant="primary" onClick={() => void onCopy(shown)}>
            Copiar al portapapeles
          </Button>
          <Button onClick={onReset}>Nueva consulta</Button>
        </div>
        {copied ? (
          <p role="status" className="copied">
            Copiado. Lo que pegues en otro sistema queda fuera de Oira.
          </p>
        ) : (
          <p className="muted">La exportación directa a PDF llegará próximamente.</p>
        )}
      </Card>
    </div>
  )
}
