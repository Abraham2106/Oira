import { createAppError } from "../utils/app-error"

export const WAV_SAMPLE_RATE = 16_000
export const WAV_CHANNELS = 1
export const WAV_BITS = 16
export const WAV_MAGIC_RIFF = "RIFF"
export const WAV_MAGIC_WAVE = "WAVE"

export const MAX_AUDIO_BYTES = 200 * 1024 * 1024

export function pcmS16leDurationMs(pcmByteLength: number): number {
  const bytesPerSecond = (WAV_SAMPLE_RATE * WAV_CHANNELS * WAV_BITS) / 8
  if (bytesPerSecond === 0) return 0
  return Math.floor((pcmByteLength / bytesPerSecond) * 1000)
}

export function wrapPcmAsWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44)
  const dataSize = pcm.length
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(WAV_CHANNELS, 22)
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24)
  header.writeUInt32LE((WAV_SAMPLE_RATE * WAV_CHANNELS * WAV_BITS) / 8, 28)
  header.writeUInt16LE((WAV_CHANNELS * WAV_BITS) / 8, 32)
  header.writeUInt16LE(WAV_BITS, 34)
  header.write("data", 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

export function assertWavFile(contents: Buffer): void {
  if (contents.length < 44) {
    throw createAppError(
      "AUDIO_FORMAT_UNSUPPORTED",
      "The audio file is empty or too small.",
      { retryable: false },
    )
  }
  if (contents.toString("ascii", 0, 4) !== WAV_MAGIC_RIFF) {
    throw createAppError(
      "AUDIO_FORMAT_UNSUPPORTED",
      "The audio file is not a WAV.",
      { retryable: false },
    )
  }
  if (contents.toString("ascii", 8, 12) !== WAV_MAGIC_WAVE) {
    throw createAppError(
      "AUDIO_FORMAT_UNSUPPORTED",
      "The audio file is not a WAV.",
      { retryable: false },
    )
  }
  const dataSize = contents.readUInt32LE(40)
  if (dataSize <= 0) {
    throw createAppError(
      "AUDIO_CAPTURE_FAILED",
      "The recording has no audio data.",
      { retryable: true },
    )
  }
}

export function wavDataDurationMs(contents: Buffer): number {
  const dataSize = contents.readUInt32LE(40)
  return pcmS16leDurationMs(dataSize)
}
