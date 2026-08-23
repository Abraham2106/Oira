import type { TranscriptSegment } from "../../shared/types/transcript"

export type SttResult = {
  requestId: string
  segments: TranscriptSegment[]
  audioDurationMs: number
}

export type SttJob = Promise<SttResult> & { requestId: string }

export type SttPort = {
  transcribeFile: (wavPath: string) => SttJob
  cancel: (requestId: string) => Promise<void>
}

export function asSttJob(requestId: string, work: Promise<SttResult>): SttJob {
  return Object.assign(work, { requestId })
}
