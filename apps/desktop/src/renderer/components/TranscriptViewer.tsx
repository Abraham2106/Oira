import { useMemo, useState } from "react"
import type { TranscriptSegment } from "@notalocal/types"
import { filterTranscript } from "../lib/consultFlow"
import { TranscriptSegmentView } from "./TranscriptSegment"

type Props = {
  segments: TranscriptSegment[]
  highlightedIds: string[]
}

export function TranscriptViewer({ segments, highlightedIds }: Props) {
  const [query, setQuery] = useState("")
  const visible = useMemo(() => filterTranscript(segments, query), [segments, query])

  if (segments.length === 0) {
    return <p className="muted">Aún no hay transcripción. Es material de origen, no la nota clínica.</p>
  }

  return (
    <div className="transcript-panel">
      <label className="field">
        Buscar en la transcripción
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Palabra, síntoma o hablante"
        />
      </label>
      <p className="muted">Texto plano. Lo que diga el paciente no cambia la configuración de la app.</p>
      {visible.length === 0 ? (
        <p className="muted">Ningún segmento coincide con «{query}».</p>
      ) : (
        <ol className="transcript">
          {visible.map((segment) => (
            <TranscriptSegmentView
              key={segment.id}
              segment={segment}
              highlighted={highlightedIds.includes(segment.id)}
            />
          ))}
        </ol>
      )}
    </div>
  )
}
