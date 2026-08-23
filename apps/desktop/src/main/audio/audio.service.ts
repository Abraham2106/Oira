import { appendFile, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { createAppError, isAppError } from "../utils/app-error"
import { cleanupEncounterAudio } from "./audio.cleanup"
import {
  MAX_AUDIO_BYTES,
  assertWavFile,
  wrapPcmAsWav,
} from "./audio.format"
import {
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

export function createAudioService(audioTempDir: string): AudioPort {
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
        if (nextSize > MAX_AUDIO_BYTES) {
          throw createAppError(
            "AUDIO_CAPTURE_FAILED",
            "The recording exceeded the size limit.",
            { retryable: false },
          )
        }
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
        const pcm = await readFile(pcmPath)
        if (pcm.length === 0) {
          throw createAppError(
            "AUDIO_CAPTURE_FAILED",
            "The recording has no audio data.",
            { retryable: true },
          )
        }
        const wav = wrapPcmAsWav(pcm)
        assertWavFile(wav)
        await writeFile(wavPath, wav)
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
  }
}
