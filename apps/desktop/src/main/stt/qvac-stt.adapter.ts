import type { TranscriptSegment } from "@oira/types"
import type { SttPort, SttResult } from "./stt.types"
import { sttEngineUnavailableError } from "./stt.types"

/**
 * QVAC integration lands here: load the local @qvac/sdk STT model, stream
 * AudioChunk bytes into on-device inference, and map final hypotheses to
 * TranscriptSegment[]. Until that engine ships, this adapter fails honestly
 * with NOT_IMPLEMENTED instead of pretending success (README honesty rule).
 */
export function createQvacSttAdapter(): SttPort {
  return {
    async transcribe(): Promise<SttResult<TranscriptSegment[]>> {
      return { ok: false, error: sttEngineUnavailableError() }
    },
  }
}
