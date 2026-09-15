// Runs only a model warm-up through the packaged renderer/preload/main IPC.
// No microphone capture, encounter, accepted note, or model download is created.
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const exe = resolve(process.argv[2] ?? 'apps/desktop/out/Oira-win32-x64/Oira.exe')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const child = spawn(exe, ['--inspect=127.0.0.1:0'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
const deadline = setTimeout(() => { child.kill(); throw new Error('PACKAGED_SMOKE_TIMEOUT') }, 120000)
let socket
try {
  const url = await new Promise((resolveUrl, reject) => {
    child.once('error', reject)
    child.once('exit', code => reject(new Error(`Packaged process exited: ${code}`)))
    child.stderr.on('data', data => {
      const text = data.toString()
      const match = text.match(/ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+/)
      if (match) resolveUrl(match[0])
    })
  })
  socket = new WebSocket(url)
  await new Promise((resolveOpen, reject) => { socket.onopen = resolveOpen; socket.onerror = reject })
  let nextId = 0
  const pending = new Map()
  socket.onmessage = ({ data }) => {
    const response = JSON.parse(data)
    if (response.id) { pending.get(response.id)?.(response); pending.delete(response.id) }
  }
  const evaluate = async expression => {
    const id = ++nextId
    const response = await new Promise(resolveResponse => {
      pending.set(id, resolveResponse)
      socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
    })
    assert(!response.error && !response.result?.exceptionDetails, JSON.stringify(response))
    return response.result.result.value
  }
  const nvidia = () => {
    try { return execFileSync('nvidia-smi', ['--query-gpu=name,memory.used', '--format=csv,noheader'], { encoding: 'utf8', windowsHide: true }).trim() }
    catch { return undefined }
  }
  if (nvidia()) console.log('PACKAGED_BASELINE', nvidia())
  const result = await evaluate(`(async () => {
    const { app, BrowserWindow } = process.getBuiltinModule('module').createRequire(process.execPath)('electron');
    await app.whenReady();
    let win;
    for (let i = 0; i < 300; i++) {
      win = BrowserWindow.getAllWindows()[0];
      if (win && !win.webContents.isLoadingMainFrame() && await win.webContents.executeJavaScript('!!window.oira')) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const result = await win.webContents.executeJavaScript('window.oira.warmTranscription()');
    return { version: app.getVersion(), packaged: app.isPackaged, result };
  })()`)
  console.log('PACKAGED_WARM', JSON.stringify(result))
  assert.equal(result.packaged, true)
  assert.equal(result.result.ok, true, JSON.stringify(result))
  if (nvidia()) console.log('PACKAGED_NVIDIA_LOADED', nvidia())
  await evaluate(`process.getBuiltinModule('module').createRequire(process.execPath)('electron').app.quit(); true`)
  console.log('PACKAGED_SMOKE_PASS')
} finally {
  socket?.close()
  clearTimeout(deadline)
  // The spawned process belongs to this smoke test only.
  if (child.exitCode === null) child.kill()
}
