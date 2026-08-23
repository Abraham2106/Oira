import { useMemo, useState } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import {
  formatRelativeTime,
  tagInitials,
  type PatientHistoryEntry,
} from "../../lib/patientTags"

type Props = {
  entries: PatientHistoryEntry[]
  onStartNew: () => void
}

export function PatientsScreen({ entries, onStartNew }: Props) {
  const [query, setQuery] = useState("")

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    [entries],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((entry) =>
      `${entry.tag} ${entry.label} ${entry.visitType}`.toLowerCase().includes(q),
    )
  }, [sorted, query])

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3_600_000
    return {
      total: entries.length,
      distinct: new Set(entries.map((entry) => entry.tag)).size,
      thisWeek: entries.filter((entry) => entry.updatedAtMs >= weekAgo).length,
    }
  }, [entries])

  return (
    <div className="page config-page">
      <header className="config-header">
        <div className="config-meta">
          <span className="kicker-chip">Pacientes</span>
        </div>
        <h1 className="page-title">Historial de pacientes</h1>
        <p className="muted config-lede">
          Cada consulta queda registrada bajo un seudónimo. Nunca se registran nombres reales ni
          datos identificables.
        </p>
      </header>

      <div className="dash-tiles">
        <div className="dash-tile">
          <h4>Consultas registradas</h4>
          <p>{stats.total}</p>
        </div>
        <div className="dash-tile">
          <h4>Seudónimos distintos</h4>
          <p>{stats.distinct}</p>
        </div>
        <div className="dash-tile">
          <h4>Últimos 7 días</h4>
          <p>{stats.thisWeek}</p>
        </div>
      </div>

      <section className="nl-card patients-history">
        <div className="patients-toolbar">
          <label className="search-field">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por seudónimo, etiqueta o tipo de consulta"
              aria-label="Buscar en el historial"
            />
          </label>
          <Button variant="primary" onClick={onStartNew}>
            Nueva consulta
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <h3>Sin resultados</h3>
            <p>Ninguna consulta coincide con «{query}».</p>
          </div>
        ) : (
          <ul className="patient-list">
            {filtered.map((entry) => (
              <li key={entry.id} className="patient-row">
                <span className="patient-avatar" aria-hidden="true">
                  {tagInitials(entry.tag)}
                </span>
                <span className="patient-row-body">
                  <strong>{entry.tag}</strong>
                  <small>
                    {[entry.label || "Consulta sin etiqueta", entry.visitType, formatRelativeTime(entry.updatedAtMs)]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                {entry.exported ? (
                  <StatusBadge tone="ok" icon="✓" label="Exportada" />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card title="Seudónimos, no nombres">
        <ol className="how-steps">
          <li>Cada consulta recibe automáticamente un seudónimo de una lista fija.</li>
          <li>El nombre real del paciente nunca entra al sistema ni a la nota.</li>
          <li>Si desea referirse a esta nota más adelante, use el seudónimo como referencia.</li>
        </ol>
      </Card>
    </div>
  )
}
