import { useEffect, useState } from "react"
import { formatElapsed } from "../lib/format"

type Props = {
  startedAtMs: number
}

export function RecordingTimer({ startedAtMs }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p className="timer" aria-live="off">
      {formatElapsed(startedAtMs, now)}
    </p>
  )
}
