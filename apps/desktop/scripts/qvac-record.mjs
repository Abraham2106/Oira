import { writeFileSync, mkdirSync } from "node:fs"
import { freemem } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { app, BrowserWindow, ipcMain, session } = require("electron")

const here = dirname(fileURLToPath(import.meta.url))
const SAMPLE_RATE = 16_000
const CHANNELS = 1
const BITS = 16
const FIXTURE_DIR = join(here, "..", "eval", "audio")
const FIXTURE_WAV = join(FIXTURE_DIR, "voice-sample.wav")

const STT_CONFIG = {
  language: "es",
  translate: false,
  temperature: 0,
  suppress_blank: true,
  suppress_nst: true,
  no_context: true,
  no_timestamps: false,
  strategy: "beam_search",
  beam_search_beam_size: 5,
}

let sdk
let modelId

function encodeWavPcm16le(pcm) {
  const header = Buffer.alloc(44)
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS) / 8
  const blockAlign = (CHANNELS * BITS) / 8
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(CHANNELS, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(BITS, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function preparePcm(pcm) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2)
  const threshold = 400
  const pad = Math.floor(SAMPLE_RATE * 0.2)
  let start = 0
  let end = samples.length - 1
  while (start < samples.length && Math.abs(samples[start]) < threshold) start += 1
  while (end > start && Math.abs(samples[end]) < threshold) end -= 1
  if (start >= end) return pcm
  start = Math.max(0, start - pad)
  end = Math.min(samples.length - 1, end + pad)
  const sliced = samples.subarray(start, end + 1)
  let peak = 1
  for (let i = 0; i < sliced.length; i++) {
    const abs = Math.abs(sliced[i])
    if (abs > peak) peak = abs
  }
  const target = 28_000
  if (peak >= target) {
    return Buffer.from(sliced.buffer, sliced.byteOffset, sliced.byteLength)
  }
  const gain = Math.min(target / peak, 8)
  const out = new Int16Array(sliced.length)
  for (let i = 0; i < sliced.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(sliced[i] * gain)))
  }
  return Buffer.from(out.buffer)
}

async function getSession() {
  if (sdk && modelId) return { sdk, modelId }
  if (freemem() < 800 * 1024 * 1024) {
    throw new Error("LOW_MEMORY")
  }
  sdk = await import("@qvac/sdk")
  modelId = await sdk.loadModel({
    modelSrc: sdk.WHISPER_SMALL_Q8_0,
    modelConfig: STT_CONFIG,
  })
  return { sdk, modelId }
}

async function releaseSession() {
  if (!sdk) return
  if (modelId) await sdk.unloadModel({ modelId }).catch(() => undefined)
  await sdk.close().catch(() => undefined)
  sdk = undefined
  modelId = undefined
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_contents, permission, callback) => {
      callback(permission === "media")
    },
  )
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission) => permission === "media" || permission === "mediaKeySystem",
  )

  ipcMain.handle("transcribe-pcm", async (_event, pcm) => {
    if (!Array.isArray(pcm) || pcm.length < 2 || pcm.length % 2 !== 0) {
      return { ok: false, error: "AUDIO_FORMAT_UNSUPPORTED" }
    }
    mkdirSync(FIXTURE_DIR, { recursive: true })
    const wav = encodeWavPcm16le(preparePcm(Buffer.from(pcm)))
    writeFileSync(FIXTURE_WAV, wav)
    process.stdout.write(`qvac.record saved=${FIXTURE_WAV}\n`)
    try {
      const session = await getSession()
      const segments = await session.sdk.transcribe({
        modelId: session.modelId,
        audioChunk: FIXTURE_WAV,
        metadata: true,
      })
      const text = segments.map((segment) => segment.text).join("").trim()
      process.stdout.write(`qvac.whisper text=${JSON.stringify(text)}\n`)
      return { ok: true, text, segments: segments.length, savedPath: FIXTURE_WAV }
    } catch (error) {
      await releaseSession()
      return {
        ok: false,
        error: error instanceof Error ? error.message : "TRANSCRIPTION_FAILED",
        savedPath: FIXTURE_WAV,
      }
    }
  })

  const window = new BrowserWindow({
    width: 480,
    height: 420,
    title: "NotaLocal · Whisper small ES",
    alwaysOnTop: true,
    webPreferences: {
      preload: join(here, "qvac-record-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  void window.loadFile(join(here, "qvac-record.html"))
})

app.on("window-all-closed", () => {
  void releaseSession().finally(() => app.quit())
})
