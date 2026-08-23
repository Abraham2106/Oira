export const WAV_SAMPLE_RATE = 16_000
export const WAV_CHANNELS = 1
export const WAV_BITS_PER_SAMPLE = 16

export function encodeWavPcm16le(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44)
  const byteRate = (WAV_SAMPLE_RATE * WAV_CHANNELS * WAV_BITS_PER_SAMPLE) / 8
  const blockAlign = (WAV_CHANNELS * WAV_BITS_PER_SAMPLE) / 8
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(WAV_CHANNELS, 22)
  header.writeUInt32LE(WAV_SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(WAV_BITS_PER_SAMPLE, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export function isWavPcm16leMono16k(file: Buffer): boolean {
  if (file.length < 44) return false
  return (
    file.subarray(0, 4).toString("ascii") === "RIFF" &&
    file.subarray(8, 12).toString("ascii") === "WAVE" &&
    file.readUInt16LE(20) === 1 &&
    file.readUInt16LE(22) === WAV_CHANNELS &&
    file.readUInt32LE(24) === WAV_SAMPLE_RATE &&
    file.readUInt16LE(34) === WAV_BITS_PER_SAMPLE
  )
}
