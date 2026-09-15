import { useMemo, useState } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import type { ClinicalNote } from "@oira/types"
import {
  formatExportPreview,
  pdfPresentationForPreview,
  type ExportPreviewFormat,
} from "../../../shared/clinical-export"
import { useI18n } from "../../i18n/I18nProvider"

export type ExportFormat = ExportPreviewFormat
export { toPlainText } from "../../../shared/clinical-export"

type Props = {
  note: ClinicalNote
  copied: boolean
  fileError: string | null
  onCopy: (text: string) => Promise<void>
  onExportPdf: (presentation: "sections" | "soap") => Promise<void>
  onExportFhir: () => Promise<void>
  onReset: () => void
}

export function ExportScreen({
  note,
  copied,
  fileError,
  onCopy,
  onExportPdf,
  onExportFhir,
  onReset,
}: Props) {
  const { t } = useI18n()
  const [format, setFormat] = useState<ExportPreviewFormat>("sections")
  const shown = useMemo(() => formatExportPreview(note, format), [note, format])

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
          <label className="format-option">
            <input
              type="radio"
              name="nl-export-format"
              value="soap"
              checked={format === "soap"}
              onChange={() => setFormat("soap")}
            />
            <span className="format-option-text">
              {t("export.formatSoap")}
              <span className="format-option-hint">{t("export.formatSoapHint")}</span>
            </span>
          </label>
        </div>
        <pre className="preview">{shown}</pre>
        <div className="actions">
          <Button variant="primary" onClick={() => void onCopy(shown)}>
            {t("export.copyButton")}
          </Button>
          <Button onClick={() => void onExportPdf(pdfPresentationForPreview(format))}>
            {t("export.pdfButton")}
          </Button>
          <Button onClick={() => void onExportFhir()}>
            {t("export.fhirButton")}
          </Button>
          <Button onClick={onReset}>{t("action.newConsult")}</Button>
        </div>
        <p className="muted">{t("export.fhirHint")}</p>
        {copied ? (
          <p role="status" className="copied">
            {t("export.copiedNotice")}
          </p>
        ) : null}
        {fileError ? (
          <p role="status" className="muted">
            {fileError}
          </p>
        ) : null}
      </Card>
    </div>
  )
}
