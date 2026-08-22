type Tone = "neutral" | "info" | "warn" | "danger" | "ok" | "recording"

type Props = {
  tone?: Tone
  icon?: string
  label: string
  live?: boolean
}

const CLASS: Record<Tone, string> = {
  neutral: "nl-badge",
  info: "nl-badge nl-badge-info",
  warn: "nl-badge nl-badge-warn",
  danger: "nl-badge nl-badge-danger",
  ok: "nl-badge nl-badge-ok",
  recording: "nl-badge nl-badge-recording",
}

export function StatusBadge({ tone = "neutral", icon, label, live }: Props) {
  return (
    <span className={CLASS[tone]} role={live ? "status" : undefined}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </span>
  )
}
