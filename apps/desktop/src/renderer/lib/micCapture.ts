const TARGET_RATE = 16_000

export function downsampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return input
  const ratio = fromRate / TARGET_RATE
  const length = Math.max(1, Math.floor(input.length / ratio))
  const output = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const src = i * ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const t = src - i0
    output[i] = input[i0]! * (1 - t) + input[i1]! * t
  }
  return output
}

export function floatToPcmBytes(float32: Float32Array): number[] {
  const pcm = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i]!))
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return Array.from(new Uint8Array(pcm.buffer))
}

export type MicCapture = {
  stop: () => Promise<void>
}

export async function startMicCapture(options: {
  onChunk: (pcm: number[], sequence: number) => Promise<void>
}): Promise<MicCapture> {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: TARGET_RATE,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
  const audioContext = new AudioContext({ sampleRate: TARGET_RATE })
  const source = audioContext.createMediaStreamSource(mediaStream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)
  let sequence = 0
  let queue = Promise.resolve()
  let failed: Error | null = null

  processor.onaudioprocess = (event) => {
    if (failed) return
    const copied = new Float32Array(event.inputBuffer.getChannelData(0))
    const pcm = floatToPcmBytes(downsampleTo16k(copied, audioContext.sampleRate))
    const next = sequence
    sequence += 1
    queue = queue
      .then(() => options.onChunk(pcm, next))
      .catch((error: unknown) => {
        failed = error instanceof Error ? error : new Error(String(error))
      })
  }

  source.connect(processor)
  const mute = audioContext.createGain()
  mute.gain.value = 0
  processor.connect(mute)
  mute.connect(audioContext.destination)

  return {
    async stop() {
      await new Promise((resolve) => setTimeout(resolve, 200))
      processor.disconnect()
      await audioContext.close()
      mediaStream.getTracks().forEach((track) => track.stop())
      await queue
      if (failed) throw failed
    },
  }
}
