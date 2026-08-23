import { useMemo, useState } from "react"
import { Button, Card, StatusBadge } from "@oira/ui"
import {
  relativeTime,
  tagInitials,
  type PatientHistoryEntry,
  type RelativeTime,
} from "../../lib/patientTags"
import { useI18n } from "../../i18n/I18nProvider"

type Props = {
  entries: PatientHistoryEntry[]
  onStartNew: () => void
}

function formatRelative(seg: RelativeTime, t: (key: string) => string): string {
  switch (seg.kind) {
    case "justNow":
      return t("time.justNow")
    case "minutes":
      return t("time.minutes").replace("{n}", String(seg.count))
    case "hours":
      return t("time.hours").replace("{n}", String(seg.count))
    case "yesterday":
      return t("time.yesterday")
    case "days":
      return t("time.days").replace("{n}", String(seg.count))
    case "oneMonth":
      return t("time.oneMonth")
    case "months":
      return t("time.months").replace("{n}", String(seg.count))
  }
}

export function PatientsScreen({ entries, onStartNew }: Props) {
  const { t } = useI18n()
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
          <span className="kicker-chip">{t("patients.kicker")}</span>
        </div>
        <h1 className="page-title">{t("patients.pageTitle")}</h1>
        <p className="muted config-lede">{t("patients.lede")}</p>
      </header>

      <div className="dash-tiles">
        <div className="dash-tile">
          <h4>{t("patients.totalTile")}</h4>
          <p>{stats.total}</p>
        </div>
        <div className="dash-tile">
          <h4>{t("patients.distinctTile")}</h4>
          <p>{stats.distinct}</p>
        </div>
        <div className="dash-tile">
          <h4>{t("patients.weekTile")}</h4>
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
              placeholder={t("patients.searchPlaceholder")}
              aria-label={t("patients.searchAria")}
            />
          </label>
          <Button variant="primary" onClick={onStartNew}>
            {t("action.newConsult")}
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state empty-state-compact">
            <h3>{t("patients.noResults")}</h3>
            <p>{t("patients.noResultsBody").replace("{query}", query)}</p>
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
                    {[
                      entry.label || t("consult.unnamedLabel"),
                      entry.visitType,
                      formatRelative(relativeTime(entry.updatedAtMs), t),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                {entry.exported ? (
                  <StatusBadge tone="ok" icon="✓" label={t("patients.exportedBadge")} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card title={t("patients.pseudonymsCardTitle")}>
        <ol className="how-steps">
          <li>{t("patients.pseudonymStep1")}</li>
          <li>{t("patients.pseudonymStep2")}</li>
          <li>{t("patients.pseudonymStep3")}</li>
        </ol>
      </Card>
    </div>
  )
}
