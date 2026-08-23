import { open } from "node:fs/promises"
import path from "node:path"
import { createAppError } from "../utils/app-error"

export const WAV_SAMPLE_RATE = 16_000
export const WAV_CHANNELS = 1
export const WAV_BITS = 16
export const WAV_HEADER_BYTES = 44
export const WAV_MAGIC_RIFF = "RIFF"
export const WAV_MAGIC_WAVE = "WAVE"
export const ALLOWED_AUDIO_EXTENSIONS = [".wav"] as const

export const MAX_AUDIO_BYTES = 200 * 1024 * 1024
export const MAX_AUDIO_DURATION_MS = 60 * 60 * 1000

export function pcmS16leDurationMs(pcmByteLength: number): number {
  const bytesPerSecond = (WAV_SAMPLE_RATE * WAV_CHANNELS * WAV_BITS) / 8
  if (bytesPerSecond === 0) return 0
  return Math.floor((pcmByteLength / bytesPerSecond) * 1000)
}

export function assertPcmWithinLimits(
  pcmByteLength: number,
  maxBytes: number = MAX_AUDIO_BYTES,
  maxDurationMs: number = MAX_AUDIO_DURATION_MS,
): void {
  if (pcmByteLength > maxBytes) {
    throw createAppError(
      "AUDIO_CAPTURE_FAILED",
      "The recording exceeded the size limit.",
      { retryable: false },
    )
  }
  if (pcmS16leDurationMs(pcmByteLength) > maxDurationMs) {
    throw createAppError(
      "AUDIO_CAPTURE_FAILED",
      "The recording exceeded the duration limit.",
      { retryable: false },
    )
  }
}

export function wavHeaderForPcmSize(dataSize: number): Buffer {
  const header = Buffer.alloc(WAV_HEADER_BYTES)
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
  return header
}

export function wrapPcmAsWav(pcm: Buffer): Buffer {
  return Buffer.concat([wavHeaderForPcmSize(pcm.length), pcm])
}

export function assertAllowedAudioExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase()
  if (!(ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext)) {
    throw createAppError(
      "AUDIO_FORMAT_UNSUPPORTED",
      "The audio file is not a WAV.",
      { retryable: false },
    )
  }
}

export function assertWavFile(contents: Buffer): void {
  if (contents.length < WAV_HEADER_BYTES) {
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

export async function assertWavFileOnDisk(filePath: string): Promise<void> {
  assertAllowedAudioExtension(filePath)
  const handle = await open(filePath, "r")
  try {
    const header = Buffer.alloc(WAV_HEADER_BYTES)
    const { bytesRead } = await handle.read(header, 0, WAV_HEADER_BYTES, 0)
    if (bytesRead < WAV_HEADER_BYTES) {
      throw createAppError(
        "AUDIO_FORMAT_UNSUPPORTED",
        "The audio file is empty or too small.",
        { retryable: false },
      )
    }
    assertWavFile(header)
    const info = await handle.stat()
    const dataSize = header.readUInt32LE(40)
    if (info.size !== WAV_HEADER_BYTES + dataSize) {
      throw createAppError(
        "AUDIO_FORMAT_UNSUPPORTED",
        "The audio file is truncated.",
        { retryable: false },
      )
    }
  } finally {
    await handle.close()
  }
}

export function wavDataDurationMs(contents: Buffer): number {
  const dataSize = contents.readUInt32LE(40)
  return pcmS16leDurationMs(dataSize)
}
