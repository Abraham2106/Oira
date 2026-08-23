import { describe, expect, it } from "vitest"
import { BrowserAudioCapture, type MediaFactory } from "./audioCapture"

class FakeStream {
  stopped = false
  private readonly tracks = [
    {
      stop: () => {
        this.stopped = true
      },
    },
  ]

  getTracks() {
    return this.tracks
  }
}

class FakeRecorder {
  static instances: FakeRecorder[] = []
  mimeType = "audio/webm;codecs=opus"
  state: "inactive" | "recording" = "inactive"
  chunksToEmit: Blob[] = []
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null

  constructor() {
    FakeRecorder.instances.push(this)
  }

  start() {
    this.state = "recording"
  }

  stop() {
    this.state = "inactive"
    const handler = this.ondataavailable
    if (handler) {
      for (const chunk of this.chunksToEmit) {
        handler({ data: chunk } as unknown as BlobEvent)
      }
    }
    this.onstop?.()
  }
}

class FakeAnalyser {
  amplitude = 0
  getFloatTimeDomainData(data: Float32Array) {
    data.fill(this.amplitude)
  }
}

class FakeSource {
  connected: FakeAnalyser | null = null
  connect(node: FakeAnalyser) {
    this.connected = node
  }
  disconnect() {
    this.connected = null
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []
  closed = false
  source = new FakeSource()
  analyser = new FakeAnalyser()

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  createMediaStreamSource() {
    return this.source
  }
  createAnalyser() {
    return this.analyser
  }
  close(): Promise<void> {
    this.closed = true
    return Promise.resolve()
  }
}

function blob(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)])
}

type Harness = {
  factory: MediaFactory
  stream: FakeStream
  lastContext: () => FakeAudioContext
  requested: MediaStreamConstraints[]
  lastRecorder: () => FakeRecorder
}

function makeHarness(options?: { failGetUserMedia?: boolean }): Harness {
  FakeRecorder.instances = []
  FakeAudioContext.instances = []
  const stream = new FakeStream()
  const requested: MediaStreamConstraints[] = []
  const factory: MediaFactory = {
    getUserMedia: async (constraints) => {
      requested.push(constraints)
      if (options?.failGetUserMedia) throw new Error("NotAllowedError")
      return stream as unknown as MediaStream
    },
    MediaRecorderCtor: FakeRecorder,
    AudioContextCtor: FakeAudioContext,
  }
  return {
    factory,
    stream,
    lastContext: () => FakeAudioContext.instances[FakeAudioContext.instances.length - 1],
    requested,
    lastRecorder: () => FakeRecorder.instances[FakeRecorder.instances.length - 1],
  }
}

describe("BrowserAudioCapture", () => {
  it("pide el dispositivo elegido o el predeterminado", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    await capture.start("bt-42")
    expect(harness.requested[0]).toEqual({ audio: { deviceId: { exact: "bt-42" } } })
    await capture.stop()
    await capture.start()
    expect(harness.requested[1]).toEqual({ audio: true })
    await capture.stop()
  })

  it("ensambla los fragmentos al detener y reporta metadatos", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    await capture.start("dev-1")
    harness.lastRecorder().chunksToEmit = [blob([1, 2]), blob([3, 4, 5])]
    const audio = await capture.stop()
    expect(audio.chunkCount).toBe(2)
    expect(Array.from(audio.bytes)).toEqual([1, 2, 3, 4, 5])
    expect(audio.mimeType).toBe("audio/webm;codecs=opus")
    expect(typeof audio.durationMs).toBe("number")
    expect(Number.isFinite(audio.durationMs ?? NaN)).toBe(true)
    expect(audio.durationMs).toBeGreaterThanOrEqual(0)
    expect(harness.lastRecorder().state).toBe("inactive")
  })

  it("produce audio vacío si no llegaron fragmentos", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    await capture.start()
    const audio = await capture.stop()
    expect(audio.chunkCount).toBe(0)
    expect(audio.bytes.byteLength).toBe(0)
  })

  it("expone un nivel RMS acotado entre 0 y 1", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    expect(capture.getLevel()).toBe(0)
    await capture.start()

    harness.lastContext().analyser.amplitude = 0.5
    expect(capture.getLevel()).toBeCloseTo(0.5, 5)

    harness.lastContext().analyser.amplitude = 9
    expect(capture.getLevel()).toBe(1)

    harness.lastContext().analyser.amplitude = -0.25
    expect(capture.getLevel()).toBeCloseTo(0.25, 5)
    await capture.stop()
    expect(capture.getLevel()).toBe(0)
  })

  it("libera la pista y cierra el contexto de audio al detener", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    await capture.start()
    await capture.stop()
    expect(harness.stream.stopped).toBe(true)
    expect(harness.lastContext().closed).toBe(true)
    expect(harness.lastContext().source.connected).toBeNull()
  })

  it("falla con mensaje claro si se niega el acceso al micrófono", async () => {
    const harness = makeHarness({ failGetUserMedia: true })
    const capture = new BrowserAudioCapture(harness.factory)
    await expect(capture.start("dev-1")).rejects.toThrow(
      "No se pudo acceder al micrófono. Revisa los permisos del sistema.",
    )
    expect(FakeRecorder.instances).toHaveLength(0)
  })

  it("no permite dos capturas simultáneas ni detener sin captura activa", async () => {
    const harness = makeHarness()
    const capture = new BrowserAudioCapture(harness.factory)
    await expect(capture.stop()).rejects.toThrow(
      "No hay captura de micrófono activa que detener.",
    )
    await capture.start()
    await expect(capture.start()).rejects.toThrow("La captura de micrófono ya está activa.")
    await capture.stop()
  })

  it("avisa cuando el entorno no expone la API del navegador", async () => {
    const capture = new BrowserAudioCapture()
    await expect(capture.start()).rejects.toThrow(
      "Este entorno no expone la API de audio del navegador.",
    )
  })
})
