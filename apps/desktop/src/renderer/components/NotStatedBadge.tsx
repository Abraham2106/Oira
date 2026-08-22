type Reason = "not_stated" | "unknown"

type Props = {
  reason: Reason
}

export function NotStatedBadge({ reason }: Props) {
  return (
    <span className="nl-badge">
      {reason === "not_stated" ? "No consta en la consulta." : "Sin determinar."}
    </span>
  )
}
