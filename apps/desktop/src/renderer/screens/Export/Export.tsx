import { useMemo, useState } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import { SECTION_TITLES } from "@oira/types"
import { useI18n } from "../../i18n/I18nProvider"

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
  const { t } = useI18n()
  const [format, setFormat] = useState<ExportFormat>("sections")
  const plain = useMemo(() => toPlainText(preview), [preview])
  const shown = format === "sections" ? preview : plain

  return (
    <div className="stack page">
      <StatusBadge tone="ok" icon="✓" label={t("export.acceptedBadge")} />
      <Card title={t("export.cardTitle")}>
        <p>{t("export.formatIntro")}</p>
        <div className="format-options" role="radiogroup" aria-label={t("export.formatAria")}>
          <label className="format-option">
            <input
              type="radio"
              name="nl-export-format"
              value="sections"
              checked={format === "sections"}
              onChange={() => setFormat("sections")}
            />
            <span className="format-option-text">
              {t("export.formatSections")}
              <span className="format-option-hint">{t("export.formatSectionsHint")}</span>
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
              {t("export.formatPlain")}
              <span className="format-option-hint">{t("export.formatPlainHint")}</span>
            </span>
          </label>
        </div>
        <pre className="preview">{shown}</pre>
        <div className="actions">
          <Button variant="primary" onClick={() => void onCopy(shown)}>
            {t("export.copyButton")}
          </Button>
          <Button onClick={onReset}>{t("action.newConsult")}</Button>
        </div>
        {copied ? (
          <p role="status" className="copied">
            {t("export.copiedNotice")}
          </p>
        ) : (
          <p className="muted">{t("export.pdfComingSoon")}</p>
        )}
      </Card>
    </div>
  )
}
