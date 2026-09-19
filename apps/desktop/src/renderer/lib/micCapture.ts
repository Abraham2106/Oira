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
  // From here on, any failure must release the mic tracks: otherwise the
  // microphone stays open (privacy leak) with no handle to stop it.
  let audioContext: AudioContext | null = null
  try {
    audioContext = new AudioContext({ sampleRate: TARGET_RATE })
    const ctx: AudioContext = audioContext
    const source = ctx.createMediaStreamSource(mediaStream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    let sequence = 0
    let queue = Promise.resolve()
    let failed: Error | null = null
    // Bound the upload backlog: at most MAX_PENDING chunks wait for the IPC
    // sink; beyond that, newest audio is dropped instead of OOMing the
    // renderer when the sink stalls.
    const MAX_PENDING = 512
    let pending = 0

    processor.onaudioprocess = (event) => {
      if (failed) return
      if (pending >= MAX_PENDING) {
        // Sink stalled: drop newest audio instead of OOMing. The resulting
        // sequence gap fails loudly on the main side (out-of-order error)
        // rather than silently producing partial audio.
        return
      }
      const copied = new Float32Array(event.inputBuffer.getChannelData(0))
      const pcm = floatToPcmBytes(downsampleTo16k(copied, ctx.sampleRate))
      const next = sequence
      sequence += 1
      pending += 1
      queue = queue
        .then(() => options.onChunk(pcm, next))
        .catch((error: unknown) => {
          failed = error instanceof Error ? error : new Error(String(error))
        })
        .finally(() => {
          pending -= 1
        })
    }

    source.connect(processor)
    const mute = ctx.createGain()
    mute.gain.value = 0
    processor.connect(mute)
    mute.connect(audioContext.destination)
    // Electron can leave a newly-created context suspended even when this was
    // initiated by a click. Without resuming it, ScriptProcessor emits no PCM.
    await ctx.resume()

    const context = ctx
    return {
      async stop() {
        try {
          // Let the final audio callback arrive before severing the graph.
          await new Promise((resolve) => setTimeout(resolve, 300))
          try {
            processor.disconnect()
          } catch {
            /* already torn down */
          }
          await context.close().catch(() => undefined)
        } finally {
          mediaStream.getTracks().forEach((track) => track.stop())
        }
        // Never wait forever: a hung IPC sink must not wedge stop().
        await Promise.race([
          queue,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Audio upload timed out.")), 15_000),
          ),
        ]).catch((error: unknown) => {
          if (failed) throw failed
          throw error
        })
        if (failed) throw failed
      },
    }
  } catch (error) {
    try {
      if (audioContext) await audioContext.close().catch(() => undefined)
    } finally {
      mediaStream.getTracks().forEach((track) => track.stop())
    }
    throw error
  }
}
