export type CapturedAudio = {
  mimeType: string
  bytes: Uint8Array
  chunkCount: number
  durationMs: number | null
}

export type AudioCapturePort = {
  start(deviceId?: string): Promise<void>
  stop(): Promise<CapturedAudio>
  getLevel(): number
}

export type MediaRecorderLike = {
  mimeType: string
  start(timeslice?: number): void
  stop(): void
  ondataavailable: ((event: BlobEvent) => void) | null
  onstop: (() => void) | null
}

export type AnalyserNodeLike = {
  getFloatTimeDomainData(data: Float32Array): void
}

export type AudioContextLike = {
  createMediaStreamSource(stream: MediaStream): {
    connect(analyser: AnalyserNodeLike): void
    disconnect(): void
  }
  createAnalyser(): AnalyserNodeLike
  close(): Promise<void>
}

/** Puntos de inyección para que las pruebas (entorno node) pasen dobles. */
export type MediaFactory = {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>
  MediaRecorderCtor: new (stream: MediaStream) => MediaRecorderLike
  AudioContextCtor: new () => AudioContextLike
}

const ERR_NO_MIC_ACCESS = "No se pudo acceder al micrófono. Revisa los permisos del sistema."
const ERR_ENVIRONMENT = "Este entorno no expone la API de audio del navegador."
const ERR_ALREADY_ACTIVE = "La captura de micrófono ya está activa."
const ERR_NOT_ACTIVE = "No hay captura de micrófono activa que detener."
const ERR_START = "No se pudo iniciar la grabación en este equipo."
const ERR_STOP = "No se pudo detener la captura de micrófono."

function defaultMediaFactory(): MediaFactory {
  const mediaDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices
  const globalWindow = typeof window === "undefined" ? undefined : window
  const getUserMedia = mediaDevices?.getUserMedia?.bind(mediaDevices)
  const MediaRecorderCtor = globalWindow?.MediaRecorder
  const AudioContextCtor = globalWindow?.AudioContext
  if (!getUserMedia || !MediaRecorderCtor || !AudioContextCtor) {
    throw new Error(ERR_ENVIRONMENT)
  }
  return {
    getUserMedia,
    // Las APIs del navegador cumplen las interfaces Like en tiempo de ejecución;
    // el molde evita la variância estricta de los manejadores de eventos.
    MediaRecorderCtor: MediaRecorderCtor as unknown as MediaFactory["MediaRecorderCtor"],
    AudioContextCtor: AudioContextCtor as unknown as MediaFactory["AudioContextCtor"],
  }
}

function resolveFactory(deps?: Partial<MediaFactory>): MediaFactory {
  if (
    deps &&
    deps.getUserMedia &&
    deps.MediaRecorderCtor &&
    deps.AudioContextCtor
  ) {
    return deps as MediaFactory
  }
  const fallback = defaultMediaFactory()
  return {
    getUserMedia: deps?.getUserMedia ?? fallback.getUserMedia,
    MediaRecorderCtor: deps?.MediaRecorderCtor ?? fallback.MediaRecorderCtor,
    AudioContextCtor: deps?.AudioContextCtor ?? fallback.AudioContextCtor,
  }
}

async function concatenateChunks(chunks: Blob[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  for (const chunk of chunks) {
    parts.push(new Uint8Array(await chunk.arrayBuffer()))
  }
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }
  return bytes
}

/**
 * Captura real de micrófono en el navegador. El audio vive en memoria
 * local; esta clase no hace ninguna llamada de red.
 */
export class BrowserAudioCapture implements AudioCapturePort {
  private readonly deps: Partial<MediaFactory>
  private stream: MediaStream | null = null
  private recorder: MediaRecorderLike | null = null
  private audioContext: AudioContextLike | null = null
  private source: ReturnType<AudioContextLike["createMediaStreamSource"]> | null = null
  private analyser: AnalyserNodeLike | null = null
  private chunks: Blob[] = []
  private stopped: Promise<void> | null = null
  private startedAtMs: number | null = null
  private level = 0
  private readonly buffer = new Float32Array(1024)

  constructor(deps?: Partial<MediaFactory>) {
    this.deps = deps ?? {}
  }

  async start(deviceId?: string): Promise<void> {
    if (this.recorder || this.stream) throw new Error(ERR_ALREADY_ACTIVE)
    const factory = resolveFactory(this.deps)

    let stream: MediaStream
    try {
      stream = await factory.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
    } catch {
      throw new Error(ERR_NO_MIC_ACCESS)
    }

    let recorder: MediaRecorderLike
    try {
      recorder = new factory.MediaRecorderCtor(stream)
    } catch {
      for (const track of stream.getTracks()) track.stop()
      throw new Error(ERR_START)
    }

    this.stream = stream
    this.chunks = []
    this.level = 0
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data)
    }
    this.recorder = recorder
    this.startedAtMs = Date.now()
    this.stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
    recorder.start()

    try {
      const context = new factory.AudioContextCtor()
      const analyser = context.createAnalyser()
      const source = context.createMediaStreamSource(stream)
      source.connect(analyser)
      this.audioContext = context
      this.analyser = analyser
      this.source = source
    } catch {
      // El medidor de nivel es opcional; la captura sigue siendo válida sin él.
    }
  }

  async stop(): Promise<CapturedAudio> {
    const recorder = this.recorder
    const stream = this.stream
    if (!recorder || !stream || this.startedAtMs === null) throw new Error(ERR_NOT_ACTIVE)

    const startedAtMs = this.startedAtMs
    this.recorder = null
    this.stream = null
    this.startedAtMs = null

    try {
      recorder.stop()
    } catch {
      throw new Error(ERR_STOP)
    }
    if (this.stopped) await this.stopped
    this.stopped = null

    this.teardownAnalysis()
    for (const track of stream.getTracks()) track.stop()

    const chunks = this.chunks
    this.chunks = []
    const bytes = await concatenateChunks(chunks)

    return {
      mimeType: recorder.mimeType ?? "",
      bytes,
      chunkCount: chunks.length,
      durationMs: Date.now() - startedAtMs,
    }
  }

  /** Nivel RMS de la última lectura, acotado a 0..1. Devuelve 0 si no hay captura. */
  getLevel(): number {
    const analyser = this.analyser
    if (!analyser || !this.recorder) return this.level
    analyser.getFloatTimeDomainData(this.buffer)
    let sumSquares = 0
    for (let i = 0; i < this.buffer.length; i += 1) {
      const sample = this.buffer[i]
      sumSquares += sample * sample
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length)
    this.level = Math.min(1, Math.max(0, rms))
    return this.level
  }

  private teardownAnalysis(): void {
    const source = this.source
    const context = this.audioContext
    this.source = null
    this.analyser = null
    this.audioContext = null
    this.level = 0
    if (source) {
      try {
        source.disconnect()
      } catch {
        // El nodo puede estar ya desconectado; nada que hacer.
      }
    }
    if (context) {
      void context.close().catch(() => undefined)
    }
  }
}
