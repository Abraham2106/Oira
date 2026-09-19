import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  audioCaptureFailedError,
  audioFormatUnsupportedError,
  audioTooLargeError,
} from "../errors/audio"
import { safeJoin } from "./safe-path"
import { encodeWavPcm16le, preparePcmForWhisper } from "./wav"

const PCM_NAME = "capture.pcm"
const WAV_NAME = "capture.wav"
const DEFAULT_MAX_BYTES = 200 * 1024 * 1024

export type AudioTempStore = {
  prepare: (encounterId: string) => void
  append: (encounterId: string, pcm: Buffer, sequence: number) => void
  finalize: (encounterId: string) => string | null
  wavPath: (encounterId: string) => string | null
  purge: (encounterId: string) => void
  sweepOrphans: () => void
}

export function createAudioTempStore(options: {
  audioTempDir: string
  maxBytes?: number
}): AudioTempStore {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const sequences = new Map<string, number>()

  const dirFor = (encounterId: string) =>
    safeJoin(options.audioTempDir, encounterId)

  return {
    prepare(encounterId) {
      const dir = dirFor(encounterId)
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
      sequences.set(encounterId, -1)
    },

    append(encounterId, pcm, sequence) {
      if (pcm.length === 0 || pcm.length % 2 !== 0) {
        throw audioFormatUnsupportedError()
      }
      const last = sequences.get(encounterId) ?? -1
      const expected = last + 1
      // Duplicate delivery of the last chunk (renderer retry): idempotent no-op.
      if (sequence === last && last >= 0) return
      if (sequence !== expected) {
        throw audioCaptureFailedError("Audio chunks arrived out of order.")
      }
      const dir = dirFor(encounterId)
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
      const pcmPath = safeJoin(dir, PCM_NAME)
      const nextSize =
        (fs.existsSync(pcmPath) ? fs.statSync(pcmPath).size : 0) + pcm.length
      if (nextSize > maxBytes) throw audioTooLargeError()
      fs.appendFileSync(pcmPath, pcm, { mode: 0o600 })
      sequences.set(encounterId, sequence)
    },

    finalize(encounterId) {
      const dir = dirFor(encounterId)
      const pcmPath = safeJoin(dir, PCM_NAME)
      if (!fs.existsSync(pcmPath) || fs.statSync(pcmPath).size === 0) {
        sequences.delete(encounterId)
        return null
      }
      // P0: the 200 MB cap is also the in-memory encode budget (read PCM → WAV).
      const wav = encodeWavPcm16le(preparePcmForWhisper(fs.readFileSync(pcmPath)))
      const wavFile = safeJoin(dir, WAV_NAME)
      fs.writeFileSync(wavFile, wav, { mode: 0o600 })
      fs.unlinkSync(pcmPath)
      sequences.delete(encounterId)
      return wavFile
    },

    wavPath(encounterId) {
      const wavFile = safeJoin(dirFor(encounterId), WAV_NAME)
      return fs.existsSync(wavFile) ? wavFile : null
    },

    purge(encounterId) {
      sequences.delete(encounterId)
      fs.rmSync(dirFor(encounterId), { recursive: true, force: true })
    },

    sweepOrphans() {
      sequences.clear()
      if (!fs.existsSync(options.audioTempDir)) return
      let names: string[]
      try {
        names = fs.readdirSync(options.audioTempDir)
      } catch {
        return
      }
      for (const name of names) {
        try {
          fs.rmSync(path.join(options.audioTempDir, name), {
            recursive: true,
            force: true,
          })
        } catch {
          // EBUSY/EPERM on Windows (file still held): leave for next start.
        }
      }
    },
  }
}

export function defaultAudioTempDir(): string {
  return path.join(os.tmpdir(), `oira-audio-${process.pid}`)
}
