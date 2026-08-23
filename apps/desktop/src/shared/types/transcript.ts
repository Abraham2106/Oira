export type TranscriptSegment = {
  id: string
  text: string
  startMs: number
  endMs: number
}

export type TranscriptRecord = {
  id: string
  encounterId: string
  text: string
  segments: TranscriptSegment[]
  /** Logical STT role from model.config, never an SDK catalog constant. */
  sttModel: string | null
}
