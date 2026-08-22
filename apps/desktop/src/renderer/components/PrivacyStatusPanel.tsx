type Row = {
  label: string
  value: string
}

type Props = {
  rows: Row[]
}

export function PrivacyStatusPanel({ rows }: Props) {
  return (
    <dl className="privacy">
      {rows.map((row) => (
        <div key={row.label} className="privacy-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
