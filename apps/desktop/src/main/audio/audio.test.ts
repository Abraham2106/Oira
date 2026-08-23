import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createAudioTempStore } from "./temp-store"
import { safeJoin } from "./safe-path"
import { encodeWavPcm16le, isWavPcm16leMono16k } from "./wav"

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function expectAppError(run: () => void, code: string): void {
  let thrown: unknown
  try {
    run()
  } catch (error) {
    thrown = error
  }
  expect(thrown).toMatchObject({ code, name: "NotaLocalAppError" })
}

describe("safeJoin", () => {
  it("keeps the result inside the base directory", () => {
    const base = mkdtempSync(join(tmpdir(), "nl-safe-"))
    dirs.push(base)
    expect(safeJoin(base, "00000000-0000-4000-8000-000000000001")).toBe(
      join(base, "00000000-0000-4000-8000-000000000001"),
    )
  })

  it("blocks parent traversal and absolute paths", () => {
    const base = mkdtempSync(join(tmpdir(), "nl-safe-"))
    dirs.push(base)
    expectAppError(() => safeJoin(base, ".."), "PATH_TRAVERSAL_BLOCKED")
    expectAppError(() => safeJoin(base, "..", "outside"), "PATH_TRAVERSAL_BLOCKED")
    expectAppError(() => safeJoin(base, "."), "PATH_TRAVERSAL_BLOCKED")
    expectAppError(() => safeJoin(base, tmpdir()), "PATH_TRAVERSAL_BLOCKED")
  })
})

describe("WAV PCM 16 kHz", () => {
  it("writes a PCM s16le mono 16 kHz header", () => {
    const pcm = Buffer.alloc(320)
    const wav = encodeWavPcm16le(pcm)
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF")
    expect(wav.readUInt32LE(4)).toBe(36 + 320)
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt32LE(24)).toBe(16_000)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(isWavPcm16leMono16k(wav)).toBe(true)
    expect(isWavPcm16leMono16k(pcm)).toBe(false)
  })
})

describe("audio temp store", () => {
  it("appends ordered PCM, finalizes a wav, then purges the encounter dir", () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-audio-"))
    dirs.push(audioTempDir)
    const store = createAudioTempStore({ audioTempDir })
    const encounterId = "00000000-0000-4000-8000-000000000001"
    const pcm = Buffer.alloc(320)

    store.prepare(encounterId)
    store.append(encounterId, pcm, 0)
    store.append(encounterId, pcm, 1)
    const wavFile = store.finalize(encounterId)

    expect(wavFile).toBe(join(audioTempDir, encounterId, "capture.wav"))
    expect(isWavPcm16leMono16k(readFileSync(wavFile!))).toBe(true)
    expect(store.wavPath(encounterId)).toBe(wavFile)

    store.purge(encounterId)
    expect(store.wavPath(encounterId)).toBeNull()
  })

  it("rejects out-of-order chunks and odd-length PCM", () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-audio-"))
    dirs.push(audioTempDir)
    const store = createAudioTempStore({ audioTempDir })
    const encounterId = "00000000-0000-4000-8000-000000000002"

    store.prepare(encounterId)
    expectAppError(
      () => store.append(encounterId, Buffer.alloc(320), 1),
      "AUDIO_CAPTURE_FAILED",
    )
    expectAppError(
      () => store.append(encounterId, Buffer.from([1]), 0),
      "AUDIO_FORMAT_UNSUPPORTED",
    )
  })

  it("maps oversized recordings to DISK_FULL", () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-audio-"))
    dirs.push(audioTempDir)
    const store = createAudioTempStore({ audioTempDir, maxBytes: 10 })
    const encounterId = "00000000-0000-4000-8000-000000000003"
    store.prepare(encounterId)
    expectAppError(
      () => store.append(encounterId, Buffer.alloc(12), 0),
      "DISK_FULL",
    )
  })

  it("clears in-memory sequences when sweeping orphans", () => {
    const audioTempDir = mkdtempSync(join(tmpdir(), "nl-audio-"))
    dirs.push(audioTempDir)
    const store = createAudioTempStore({ audioTempDir })
    const encounterId = "00000000-0000-4000-8000-000000000004"
    store.prepare(encounterId)
    store.append(encounterId, Buffer.alloc(320), 0)
    store.sweepOrphans()
    store.prepare(encounterId)
    expect(() => store.append(encounterId, Buffer.alloc(320), 0)).not.toThrow()
  })
})
