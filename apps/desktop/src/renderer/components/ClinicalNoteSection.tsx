import { SECTION_TITLES, type FieldValue, type SectionId } from "@notalocal/types"
import { NotStatedBadge } from "./NotStatedBadge"

type Props = {
  id: SectionId
  value: FieldValue
  readOnly: boolean
  onChange: (text: string) => void
}

export function ClinicalNoteSection({ id, value, readOnly, onChange }: Props) {
  const hasSource = value.sourceSegmentIds.length > 0

  return (
    <article className="section">
      <header className="section-head">
        <h3>{SECTION_TITLES[id]}</h3>
        {value.presence === "NOT_STATED" ? <NotStatedBadge reason="not_stated" /> : null}
        {value.presence === "UNKNOWN" ? <NotStatedBadge reason="unknown" /> : null}
      </header>
      <textarea
        id={id}
        readOnly={readOnly}
        value={value.text}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        aria-label={SECTION_TITLES[id]}
      />
      <p className="muted">
        {hasSource ? "Origen: segmentos de la transcripción." : "Sin origen identificado. Revisa antes de aceptar."}
      </p>
    </article>
  )
}
