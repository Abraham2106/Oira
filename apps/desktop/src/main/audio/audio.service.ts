import { createReadStream, createWriteStream } from "node:fs"
import { appendFile, readdir, stat, writeFile } from "node:fs/promises"
import { pipeline } from "node:stream/promises"
import { createAppError, isAppError } from "../utils/app-error"
import { cleanupEncounterAudio } from "./audio.cleanup"
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_DURATION_MS,
  assertPcmWithinLimits,
  assertWavFileOnDisk,
  wavHeaderForPcmSize,
} from "./audio.format"
import {
  encounterAudioDir,
  encounterPcmPath,
  encounterWavPath,
  ensureEncounterAudioDir,
} from "./audio.temp"

export type AudioPort = {
  prepare: (encounterId: string) => Promise<void>
  appendChunk: (encounterId: string, chunk: Uint8Array) => Promise<void>
  finalize: (encounterId: string) => Promise<{ wavPath: string }>
  cleanup: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
  encounterDir: (encounterId: string) => string
}

export type AudioServiceOptions = {
  maxBytes?: number
  maxDurationMs?: number
}

function mapFsError(error: unknown): never {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: string }).code)
      : ""
  if (code === "ENOSPC") {
    throw createAppError("DISK_FULL", "There is not enough disk space.", {
      retryable: false,
      cause: error,
    })
  }
  throw createAppError("AUDIO_CAPTURE_FAILED", "The recording could not be saved.", {
    retryable: true,
    cause: error,
  })
}

export function createAudioService(
  audioTempDir: string,
  options: AudioServiceOptions = {},
): AudioPort {
  const maxBytes = options.maxBytes ?? MAX_AUDIO_BYTES
  const maxDurationMs = options.maxDurationMs ?? MAX_AUDIO_DURATION_MS

  return {
    async prepare(encounterId) {
      await cleanupEncounterAudio(audioTempDir, encounterId)
      await ensureEncounterAudioDir(audioTempDir, encounterId)
    },

    async appendChunk(encounterId, chunk) {
      if (chunk.byteLength === 0) return
      const pcmPath = encounterPcmPath(audioTempDir, encounterId)
      try {
        const current = await stat(pcmPath).catch(() => null)
        const nextSize = (current?.size ?? 0) + chunk.byteLength
        assertPcmWithinLimits(nextSize, maxBytes, maxDurationMs)
        await appendFile(pcmPath, Buffer.from(chunk))
      } catch (error) {
        if (isAppError(error)) throw error
        mapFsError(error)
      }
    },

    async finalize(encounterId) {
      const pcmPath = encounterPcmPath(audioTempDir, encounterId)
      const wavPath = encounterWavPath(audioTempDir, encounterId)
      try {
        const pcmInfo = await stat(pcmPath).catch(() => null)
        if (!pcmInfo || pcmInfo.size === 0) {
          throw createAppError(
            "AUDIO_CAPTURE_FAILED",
            "The recording has no audio data.",
            { retryable: true },
          )
        }
        assertPcmWithinLimits(pcmInfo.size, maxBytes, maxDurationMs)
        await writeFile(wavPath, wavHeaderForPcmSize(pcmInfo.size))
        await pipeline(createReadStream(pcmPath), createWriteStream(wavPath, { flags: "a" }))
        await assertWavFileOnDisk(wavPath)
        return { wavPath }
      } catch (error) {
        if (isAppError(error)) throw error
        mapFsError(error)
      }
    },

    async cleanup(encounterId) {
      await cleanupEncounterAudio(audioTempDir, encounterId)
    },

    async listEncounterIds() {
      const entries = await readdir(audioTempDir, { withFileTypes: true }).catch(
        () => [],
      )
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    },

    encounterDir(encounterId) {
      return encounterAudioDir(audioTempDir, encounterId)
    },
  }
}
