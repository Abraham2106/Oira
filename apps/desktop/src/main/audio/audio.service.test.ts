import { mkdtemp, open, readdir, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { isAppError } from "../utils/app-error"
import { WAV_HEADER_BYTES, WAV_MAGIC_RIFF, WAV_MAGIC_WAVE } from "./audio.format"
import { WAV_FILENAME } from "./audio.temp"
import { createAudioService } from "./audio.service"

const ID = "11111111-1111-4111-8111-111111111111"

describe("createAudioService", () => {
  it("appends PCM and finalizes a WAV without embedding the path from the caller", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-audio-svc-"))
    const audio = createAudioService(audioTempDir)
    await audio.prepare(ID)
    await audio.appendChunk(ID, new Uint8Array(320))
    const { wavPath } = await audio.finalize(ID)

    expect(wavPath).toBe(join(audioTempDir, ID, WAV_FILENAME))
    expect(wavPath.toLowerCase().endsWith(".wav")).toBe(true)
    const info = await stat(wavPath)
    expect(info.size).toBe(WAV_HEADER_BYTES + 320)

    const handle = await open(wavPath, "r")
    const header = Buffer.alloc(WAV_HEADER_BYTES)
    await handle.read(header, 0, WAV_HEADER_BYTES, 0)
    await handle.close()
    expect(header.toString("ascii", 0, 4)).toBe(WAV_MAGIC_RIFF)
    expect(header.toString("ascii", 8, 12)).toBe(WAV_MAGIC_WAVE)
  })

  it("rejects append past the injected size limit", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-audio-lim-"))
    const audio = createAudioService(audioTempDir, { maxBytes: 8 })
    await audio.prepare(ID)
    await audio.appendChunk(ID, new Uint8Array(8))
    await expect(audio.appendChunk(ID, new Uint8Array(2))).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "AUDIO_CAPTURE_FAILED",
    )
  })

  it("rejects finalize when there is no audio data", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-audio-empty-"))
    const audio = createAudioService(audioTempDir)
    await audio.prepare(ID)
    await expect(audio.finalize(ID)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "AUDIO_CAPTURE_FAILED",
    )
  })

  it("does not create files when the encounter id is invalid", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-audio-bad-"))
    const audio = createAudioService(audioTempDir)
    await expect(audio.prepare("not-a-uuid")).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INVALID_INPUT",
    )
    await expect(audio.prepare("../etc/passwd")).rejects.toSatisfy(
      (error: unknown) =>
        isAppError(error) &&
        (error.code === "INVALID_INPUT" || error.code === "PATH_TRAVERSAL_BLOCKED"),
    )
    expect(await readdir(audioTempDir)).toEqual([])
  })

  it("cleanup removes the encounter audio directory", async () => {
    const audioTempDir = await mkdtemp(join(tmpdir(), "notalocal-audio-rm-"))
    const audio = createAudioService(audioTempDir)
    await audio.prepare(ID)
    await audio.appendChunk(ID, new Uint8Array(320))
    await audio.finalize(ID)
    await audio.cleanup(ID)
    expect(await readdir(audioTempDir)).toEqual([])
    expect(await readFile(join(audioTempDir, ID, WAV_FILENAME)).catch(() => "gone")).toBe(
      "gone",
    )
  })
})
