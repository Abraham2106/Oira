import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isAppError } from "../utils/app-error"
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_DURATION_MS,
  WAV_HEADER_BYTES,
  assertAllowedAudioExtension,
  assertPcmWithinLimits,
  assertWavFile,
  assertWavFileOnDisk,
  pcmS16leDurationMs,
  wrapPcmAsWav,
} from "./audio.format"

describe("audio.format", () => {
  it("rejects size and duration over the hard caps", () => {
    expect(() => assertPcmWithinLimits(MAX_AUDIO_BYTES + 1)).toThrow()
    try {
      assertPcmWithinLimits(MAX_AUDIO_BYTES + 1)
    } catch (error) {
      expect(isAppError(error) && error.code === "AUDIO_CAPTURE_FAILED").toBe(true)
    }

    const overDurationBytes = 32 * (MAX_AUDIO_DURATION_MS + 1)
    expect(pcmS16leDurationMs(overDurationBytes)).toBeGreaterThan(MAX_AUDIO_DURATION_MS)
    expect(() => assertPcmWithinLimits(overDurationBytes)).toThrow()
  })

  it("accepts PCM under both caps", () => {
    expect(() => assertPcmWithinLimits(320)).not.toThrow()
  })

  it("rejects a non-WAV extension and a non-RIFF buffer", () => {
    expect(() => assertAllowedAudioExtension("clip.webm")).toThrow()
    try {
      assertAllowedAudioExtension("clip.webm")
    } catch (error) {
      expect(isAppError(error) && error.code === "AUDIO_FORMAT_UNSUPPORTED").toBe(true)
    }
    expect(() => assertWavFile(Buffer.from("not-a-wav-file-at-all!!!!"))).toThrow()
  })

  it("validates a WAV on disk from the header only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "notalocal-wav-"))
    const wavPath = join(dir, "capture.wav")
    const wav = wrapPcmAsWav(Buffer.alloc(320))
    expect(wav.length).toBe(WAV_HEADER_BYTES + 320)
    await writeFile(wavPath, wav)
    await assertWavFileOnDisk(wavPath)

    const badPath = join(dir, "broken.wav")
    await writeFile(badPath, "RIFF----NOTWAVE")
    await expect(assertWavFileOnDisk(badPath)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "AUDIO_FORMAT_UNSUPPORTED",
    )
  })
})
