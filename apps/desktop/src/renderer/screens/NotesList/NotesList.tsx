import { Button } from "@oira/ui"
import { Icon } from "../../components/icons"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  hasSessionNote: boolean
  sessionStateLabel: string
  noteLabel: string
  onView: () => void
  onStartNew: () => void
}

export function NotesListScreen({
  hasSessionNote,
  sessionStateLabel,
  noteLabel,
  onView,
  onStartNew,
}: Props) {
  const { t } = useI18n()
  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">{t("notes.kicker")}</span>
        </div>
        <h1 className="page-title">{t("notes.pageTitle")}</h1>
        <p className="muted config-lede">{t("notes.lede")}</p>
      </header>

      {hasSessionNote ? (
        <section className="nl-card list-row">
          <span className="list-row-dot" aria-hidden="true" />
          <span className="list-row-body">
            <strong>{noteLabel.trim() ? noteLabel : t("consult.unnamedLabel")}</strong>
            <small>{t("notesList.sessionRow").replace("{state}", sessionStateLabel)}</small>
          </span>
          <Button onClick={onView}>{t("notes.open")}</Button>
        </section>
      ) : (
        <div className="empty-state">
          <span className="icon-wrap">
            <Icon name="note" size={26} />
          </span>
          <h3>{t("notes.emptyTitle")}</h3>
          <p>{t("notes.emptyBody")}</p>
          <Button variant="primary" onClick={onStartNew}>
            {t("notes.startFirst")}
          </Button>
        </div>
      )}

      <p className="muted notes-footnote">{t("notes.footnote")}</p>
    </div>
  )
}
