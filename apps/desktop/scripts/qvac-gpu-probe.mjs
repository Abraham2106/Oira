import { createRequire } from 'node:module'
import { spawn, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (!process.versions.electron) {
  const electron = createRequire(import.meta.url)('electron')
  const child = spawn(electron, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit', windowsHide: true,
  })
  child.on('exit', code => process.exit(code ?? 1))
} else {
  console.log('PROBE_START', process.versions.electron, process.versions.node)
  process.env.QVAC_CONFIG_PATH = fileURLToPath(new URL('./qvac-gpu-probe.config.mjs', import.meta.url))
  const sdk = await import('@qvac/sdk')
  const timer = setTimeout(() => { console.error('PROBE_TIMEOUT'); process.exit(1) }, 120000)
  let id
  const logs = sdk.loggingStream({ id: sdk.SDK_ALL_LOG_ID })
  const consume = (async () => { for await (const log of logs) console.log('NATIVE', JSON.stringify(log)) })()
  consume.catch(error => console.error('LOG_STREAM', error.message))
  try {
    if (process.argv[2] === 'resources') console.log('RESOURCES', JSON.stringify(await sdk.getSystemResources({ sample: true })))
    const kind = process.argv[2] ?? 'whisper'
    const modelPath = process.argv[3]
    if (kind === 'runtime') {
      const { createQvacInferenceRuntime } = await import('../out/gpu-smoke/runtime.mjs')
      const measure = () => execFileSync('nvidia-smi', ['--query-gpu=name,memory.used', '--format=csv,noheader'], { encoding: 'utf8', windowsHide: true }).trim()
      const runtime = createQvacInferenceRuntime({
        modelPaths: { whisper: `${modelPath}/ggml-large-v3-turbo.bin`, qwen: `${modelPath}/Qwen3-4B-Q4_K_M.gguf` },
        onModelLifecycle: event => console.log('LIFECYCLE', JSON.stringify(event)),
      })
      try {
        console.log('NVIDIA_BASELINE', measure())
        await runtime.warmTranscription()
        console.log('NVIDIA_WHISPER', measure())
        const segments = await runtime.transcribe({ filePath: fileURLToPath(new URL('../../../eval/audio/01-simple/audio.wav', import.meta.url)) })
        console.log('SYNTHETIC_SEGMENTS', segments.length)
        if (!segments.length) throw new Error('EMPTY_TRANSCRIPTION')
        await runtime.handoffToStructuring()
        console.log('NVIDIA_QWEN', measure())
        const reply = await runtime.completeQwen({ role: 'generator', prompt: 'Return only the JSON object {"ok":true}. /no_think' })
        console.log('SYNTHETIC_COMPLETION', reply)
        if (!reply.includes('true')) throw new Error('INVALID_COMPLETION')
      } finally { await runtime.shutdown() }
    } else if (modelPath) {
      const config = kind === 'whisper'
        ? { contextParams: { use_gpu: true, gpu_device: Number(process.argv[4] ?? 1) } }
        : { device: 'gpu', gpu_layers: 99, 'split-mode': 'none', 'main-gpu': 'dedicated', ctx_size: 4096 }
      console.log('LOAD_CONFIG', JSON.stringify(config))
      console.log('NVIDIA_BEFORE', execFileSync('nvidia-smi', ['--query-gpu=name,memory.used', '--format=csv,noheader'], { encoding: 'utf8', windowsHide: true }))
      id = await sdk.loadModel({ modelSrc: modelPath, modelType: kind === 'whisper' ? 'whispercpp-transcription' : 'llamacpp-completion', modelConfig: config })
      console.log('LOADED', id, JSON.stringify(await sdk.getLoadedModelInfo({ modelId: id })))
      console.log('NVIDIA_LOADED', execFileSync('nvidia-smi', ['--query-gpu=name,memory.used', '--format=csv,noheader'], { encoding: 'utf8', windowsHide: true }))
    }
  } finally {
    if (id) await sdk.unloadModel({ modelId: id })
    await sdk.close()
    clearTimeout(timer)
  }
  console.log('PROBE_DONE')
}
