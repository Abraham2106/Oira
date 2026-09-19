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
  if (!Array.isArray(raw)) throw new Error("STT segments must be an array")
  return raw.map((segment, index) => {
    const rawId = segment?.id == null ? "" : String(segment.id)
    const startMs = segment ? segment.startMs : undefined
    const text = typeof segment?.text === "string" ? segment.text : ""
    return {
      id: rawId.length > 0 ? rawId : `seg-${index + 1}`,
      speaker: null,
      startMs: Number.isFinite(startMs)
        ? Math.max(0, Math.round(startMs as number))
        : 0,
      text,
    }
  })
}
