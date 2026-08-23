import type { TranscriptSegment } from "@oira/types"

/** Shape documented for Whisper metadata — not an SDK import. */
export type SttSegmentInput = {
  id?: string | number
  text: string
  startMs: number
  endMs?: number
  append?: boolean
}

/**
 * Maps engine segments to our transcript. P0 has no diarization.
 * `append` is ignored until its semantics are confirmed on the pinned SDK.
 */
export function mapSttSegments(raw: SttSegmentInput[]): TranscriptSegment[] {
  return raw.map((segment, index) => {
    const rawId = segment.id == null ? "" : String(segment.id)
    return {
      id: rawId.length > 0 ? rawId : `seg-${index + 1}`,
      speaker: null,
      startMs: segment.startMs,
      text: segment.text,
    }
  })
}
