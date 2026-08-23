import { readFile } from "node:fs/promises"
import type { TranscriptSegment } from "../../shared/types/transcript"
import { createAppError } from "../utils/app-error"
import { assertWavFile, wavDataDurationMs } from "../audio/audio.format"
import { asSttJob, type SttPort } from "../qvac/stt.port"

export type { SttJob, SttPort, SttResult } from "../qvac/stt.port"
export { asSttJob } from "../qvac/stt.port"

/** Deterministic stand-in. Does not import @qvac/sdk. Fails if the WAV is missing or invalid. */
export function createMockSttPort(): SttPort {
  return {
    transcribeFile(wavPath) {
      const requestId = crypto.randomUUID()
      return asSttJob(
        requestId,
        (async () => {
          let contents: Buffer
          try {
            contents = await readFile(wavPath)
          } catch {
            throw createAppError(
              "TRANSCRIPTION_FAILED",
              "There is no audio file to transcribe.",
              { retryable: false },
            )
          }
          assertWavFile(contents)
          const audioDurationMs = wavDataDurationMs(contents)
          const segments: TranscriptSegment[] = [
            {
              id: crypto.randomUUID(),
              text: "[mock transcript]",
              startMs: 0,
              endMs: Math.max(audioDurationMs, 1),
            },
          ]
          return { requestId, segments, audioDurationMs }
        })(),
      )
    },
    async cancel() {},
  }
}
