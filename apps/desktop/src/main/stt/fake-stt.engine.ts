import type { TranscriptSegment } from "@oira/types"
import { SYNTHETIC_TRANSCRIPT } from "../../shared/fixtures/synthetic-consult"
import {
  emptyAudioInputError,
  type AudioChunk,
  type SttPort,
  type SttResult,
} from "./stt.types"

export type FakeSttOptions = {
  /**
   * Simulated inference latency in milliseconds. Defaults to 0 so tests do
   * not schedule real timers; inject a value plus fake timers to exercise
   * waiting behavior deterministically.
   */
  latencyMs?: number
}

/**
 * Deterministic STT implementation for the prototype pipeline. Ignores the
 * audio bytes and returns the synthetic fixture transcript verbatim: segment
 * ids and timestamps intentionally match `SYNTHETIC_TRANSCRIPT` so downstream
 * structuring keeps resolving the fixture's `sourceSegmentIds`. Same input
 * always yields the same output — no randomness, no hidden call state.
 */
export function createFakeSttEngine(options: FakeSttOptions = {}): SttPort {
  const latencyMs = options.latencyMs ?? 0

  return {
    async transcribe(chunks: readonly AudioChunk[]): Promise<SttResult<TranscriptSegment[]>> {
      if (chunks.length === 0) {
        return { ok: false, error: emptyAudioInputError() }
      }

      if (latencyMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, latencyMs)
        })
      }

      // Defensive copy: callers may mutate their result without corrupting
      // the shared fixture or a concurrent caller's result.
      const segments = SYNTHETIC_TRANSCRIPT.map((segment) => ({ ...segment }))
      return { ok: true, data: segments }
    },
  }
}
