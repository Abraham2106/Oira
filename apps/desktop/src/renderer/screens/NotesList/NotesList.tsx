import { Button } from "@oira/ui"
import { Icon } from "../../components/icons"

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
  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Notas</span>
        </div>
        <h1 className="page-title">Notas clínicas</h1>
        <p className="muted config-lede">
          Cada nota queda disponible después de que usted la acepta y exporta.
        </p>
      </header>

      {hasSessionNote ? (
        <section className="nl-card list-row">
          <span className="list-row-dot" aria-hidden="true" />
          <span className="list-row-body">
            <strong>{noteLabel.trim() ? noteLabel : "Consulta sin etiqueta"}</strong>
            <small>
              Sesión actual · {sessionStateLabel}
            </small>
          </span>
          <Button onClick={onView}>Abrir</Button>
        </section>
      ) : (
        <div className="empty-state">
          <span className="icon-wrap">
            <Icon name="note" size={26} />
          </span>
          <h3>Aún no hay notas</h3>
          <p>Cuando acepte su primera nota, aparecerá aquí para volver a consultarla o copiarla.</p>
          <Button variant="primary" onClick={onStartNew}>
            Iniciar una consulta
          </Button>
        </div>
      )}

      <p className="muted notes-footnote">
        El histórico de notas estará disponible en cuanto el almacenamiento local esté conectado.
      </p>
    </div>
  )
}
