import { createQvacInferenceRuntime } from '../apps/desktop/src/main/qvac/inference-runtime'
import * as sdk from '../apps/desktop/src/main/qvac/sdk'
import { writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
const started = performance.now()
const mark = (event: string) => process.stdout.write(JSON.stringify({event, ms: Math.round(performance.now()-started)})+'\n')
const wrapped = { ...sdk,
  getSystemResources: (...args: Parameters<typeof sdk.getSystemResources>) => {
    mark('resources-request'); const result = sdk.getSystemResources(...args)
    void result.then(()=>mark('resources-done'),()=>mark('resources-failed')); return result
  },
  loadModel: (...args: Parameters<typeof sdk.loadModel>) => {
    mark('load-request:'+args[0].modelSrc.name); const result = sdk.loadModel(...args)
    void result.then(()=>mark('load-done:'+args[0].modelSrc.name),()=>mark('load-failed')); return result
  },
  unloadModel: (...args: Parameters<typeof sdk.unloadModel>) => {
    mark('unload-request'); const result = sdk.unloadModel(...args)
    void result.then(()=>mark('unload-done'),()=>mark('unload-failed')); return result
  },
}
const runtime = createQvacInferenceRuntime({loadSdk: async()=>wrapped, onModelLifecycle:e=>mark(e.model+':'+e.state)})
const path = resolve('reports/handoff-synthetic-silence.wav')
const samples = Buffer.alloc(16000)
const header = Buffer.alloc(44)
header.write('RIFF'); header.writeUInt32LE(36+samples.length,4); header.write('WAVEfmt ',8)
header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22)
header.writeUInt32LE(16000,24); header.writeUInt32LE(32000,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34)
header.write('data',36); header.writeUInt32LE(samples.length,40)
writeFileSync(path, Buffer.concat([header,samples]))
try {
  await runtime.warmTranscription()
  await runtime.transcribe({filePath:path})
  mark('whisper-finished')
  await runtime.handoffToStructuring()
  mark('handoff-finished')
} finally { await runtime.shutdown(); unlinkSync(path) }
