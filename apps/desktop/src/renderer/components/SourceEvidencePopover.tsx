import { quotesForSources } from "../lib/consultFlow"
import type { TranscriptSegment } from "@oira/types"

type Props = {
  sourceSegmentIds: string[]
  transcript: TranscriptSegment[]
  onJump: (segmentId: string) => void
}

export function SourceEvidencePopover({ sourceSegmentIds, transcript, onJump }: Props) {
  if (sourceSegmentIds.length === 0) {
    return <p className="muted">Sin origen identificado. Revisa antes de aceptar.</p>
  }

  const quotes = quotesForSources(transcript, sourceSegmentIds)

  return (
    <div className="evidence">
      <p className="evidence-label">Origen en la transcripción</p>
      <ul>
        {quotes.map((item) => (
          <li key={item.id}>
            {item.found ? (
              <button type="button" className="linkish" onClick={() => onJump(item.id)}>
                «{item.quote}»
              </button>
            ) : (
              <span className="muted">Sin origen identificado ({item.id}).</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
