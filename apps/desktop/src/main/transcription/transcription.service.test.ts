import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { wrapPcmAsWav } from "../audio/audio.format"
import { createAppError, isAppError } from "../utils/app-error"
import { createTranscriptionService } from "./transcription.service"
import { asSttJob, type SttPort, type SttResult } from "./stt.port"

describe("createTranscriptionService", () => {
  it("cancels the STT job when the timeout fires", async () => {
    const dir = await mkdtemp(join(tmpdir(), "notalocal-stt-"))
    const wavPath = join(dir, "capture.wav")
    await writeFile(wavPath, wrapPcmAsWav(Buffer.alloc(320)))

    const cancelled: string[] = []
    const hanging: SttPort = {
      transcribeFile() {
        const requestId = "req-timeout"
        return asSttJob(
          requestId,
          new Promise<SttResult>(() => {}),
        )
      },
      async cancel(requestId) {
        cancelled.push(requestId)
      },
    }

    const transcription = createTranscriptionService({
      stt: hanging,
      timeoutMs: () => 20,
    })

    await expect(
      transcription.transcribe({
        encounterId: "11111111-1111-4111-8111-111111111111",
        wavPath,
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "TRANSCRIPTION_FAILED",
    )
    expect(cancelled.length).toBeGreaterThanOrEqual(1)
    expect(cancelled.every((id) => id === "req-timeout")).toBe(true)
  })

  it("does not retry a deterministic invalid-audio failure", async () => {
    let calls = 0
    const stt: SttPort = {
      transcribeFile() {
        calls += 1
        return asSttJob(
          "req-1",
          Promise.reject(
            createAppError("AUDIO_FORMAT_UNSUPPORTED", "bad wav", {
              retryable: false,
            }),
          ),
        )
      },
      async cancel() {},
    }
    const dir = await mkdtemp(join(tmpdir(), "notalocal-stt-"))
    const wavPath = join(dir, "capture.wav")
    await writeFile(wavPath, wrapPcmAsWav(Buffer.alloc(320)))
    const transcription = createTranscriptionService({ stt })
    await expect(
      transcription.transcribe({
        encounterId: "11111111-1111-4111-8111-111111111111",
        wavPath,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isAppError(error) && error.code === "AUDIO_FORMAT_UNSUPPORTED",
    )
    expect(calls).toBe(1)
  })

  it("does not retry MODEL_NOT_READY even if marked retryable", async () => {
    let calls = 0
    const stt: SttPort = {
      transcribeFile() {
        calls += 1
        return asSttJob(
          "req-model",
          Promise.reject(
            createAppError("MODEL_NOT_READY", "stt missing", { retryable: true }),
          ),
        )
      },
      async cancel() {},
    }
    const dir = await mkdtemp(join(tmpdir(), "notalocal-stt-"))
    const wavPath = join(dir, "capture.wav")
    await writeFile(wavPath, wrapPcmAsWav(Buffer.alloc(320)))
    const transcription = createTranscriptionService({ stt })
    await expect(
      transcription.transcribe({
        encounterId: "11111111-1111-4111-8111-111111111111",
        wavPath,
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "MODEL_NOT_READY",
    )
    expect(calls).toBe(1)
  })

  it("emits progress and cancels an in-flight job without persisting a transcript", async () => {
    const seen: string[] = []
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const stt: SttPort = {
      transcribeFile() {
        entered()
        return asSttJob("req-cancel", new Promise<SttResult>(() => {}))
      },
      async cancel() {},
    }
    const dir = await mkdtemp(join(tmpdir(), "notalocal-stt-"))
    const wavPath = join(dir, "capture.wav")
    await writeFile(wavPath, wrapPcmAsWav(Buffer.alloc(320)))
    const transcription = createTranscriptionService({
      stt,
      onProgress: (event) => {
        seen.push(event.status)
      },
    })
    const encounterId = "11111111-1111-4111-8111-111111111111"
    const pending = transcription.transcribe({ encounterId, wavPath })
    await started
    await transcription.cancel(encounterId)
    await expect(pending).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "OPERATION_CANCELLED",
    )
    expect(seen).toEqual(["loading-model", "transcribing", "cancelled"])
  })
})
