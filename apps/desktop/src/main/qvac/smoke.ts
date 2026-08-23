import os from "node:os"
import { P0_SMOKE_MODEL_ID } from "./model-ids"
import { close, loadModel, unloadModel, WHISPER_SMALL_Q8_0 } from "./sdk"

const LOAD_WATCHDOG_MS = 120_000
const MIN_FREE_BYTES = 800 * 1024 * 1024

function assertResources(): void {
  if (os.freemem() < MIN_FREE_BYTES) {
    throw new Error("LOW_MEMORY")
  }
}

export async function runQvacSmoke(): Promise<{ loaded: true; expectedSize: number }> {
  if (WHISPER_SMALL_Q8_0.name !== P0_SMOKE_MODEL_ID) {
    throw new Error("SMOKE_MODEL_MISMATCH")
  }
  assertResources()

  let modelId: string | undefined
  const watchdog = AbortSignal.timeout(LOAD_WATCHDOG_MS)
  try {
    modelId = await Promise.race([
      loadModel({
        modelSrc: WHISPER_SMALL_Q8_0,
        onProgress: (progress) => {
          assertResources()
          const percentage = Number(progress.percentage)
          if (Number.isFinite(percentage)) {
            process.stderr.write(`qvac.smoke ${Math.round(percentage)}\n`)
          }
        },
      }),
      new Promise<never>((_, reject) => {
        watchdog.addEventListener("abort", () => {
          reject(new Error("LOAD_WATCHDOG"))
        })
      }),
    ])
    await unloadModel({ modelId })
    return { loaded: true, expectedSize: WHISPER_SMALL_Q8_0.expectedSize }
  } finally {
    await close().catch(() => undefined)
  }
}
