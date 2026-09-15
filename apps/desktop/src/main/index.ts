import { app, BrowserWindow, clipboard, ipcMain, session, shell } from "electron"
import { spawn } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { IPC_EVENTS } from "../shared/constants/ipc-channels"
import { createAudioTempStore, defaultAudioTempDir } from "./audio"
import { loadAppConfig, resolveAppEnv } from "./config"
import { composeApplication } from "./composition"
import {
  createIpcLogger,
  registerIpc,
  type IpcHandle,
} from "./ipc"
import { withTrustedIpcSender, type TrustedRenderer } from "./ipc/sender-guard"
import { createLogger, type Logger } from "./logging"
import { parseEmbeddedRuntime, runtimeLogMeta } from "./runtime"
import { tmpdir } from "node:os"
import { createSetupService } from "./setup"

const moduleDir = dirname(fileURLToPath(import.meta.url))
const SQUIRREL_EVENTS = new Set([
  "--squirrel-install",
  "--squirrel-updated",
  "--squirrel-uninstall",
  "--squirrel-obsolete",
])
const squirrelEvent = process.platform === "win32" &&
  process.argv.find((argument) => SQUIRREL_EVENTS.has(argument))

function handleSquirrelEvent(event: string): void {
  const updateExe = join(dirname(process.execPath), "..", "Update.exe")
  const action = event === "--squirrel-uninstall"
    ? "--removeShortcut"
    : event === "--squirrel-install" || event === "--squirrel-updated"
      ? "--createShortcut"
      : null
  if (action) {
    const child = spawn(updateExe, [action, "Oira.exe"], {
      detached: true,
      stdio: "ignore",
    })
    child.unref()
  }
  app.quit()
}

function bindIpcMain(trusted: () => readonly TrustedRenderer[]): IpcHandle {
  const handle: IpcHandle = (channel, listener) => {
    ipcMain.handle(channel, listener)
  }
  return withTrustedIpcSender(handle, trusted)
}

function createWindow(trusted: Map<number, TrustedRenderer>): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "oira",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(moduleDir, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const url = process.env.ELECTRON_RENDERER_URL ??
    pathToFileURL(join(moduleDir, "../renderer/index.html")).href
  const blockUnexpectedNavigation = (
    details: { preventDefault: () => void; url: string; isMainFrame: boolean },
  ) => {
    if (!details.isMainFrame || details.url !== url) details.preventDefault()
  }
  window.webContents.on("will-navigate", blockUnexpectedNavigation)
  window.webContents.on("will-frame-navigate", blockUnexpectedNavigation)
  window.webContents.on("will-redirect", blockUnexpectedNavigation)
  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: "deny" }
  })

  trusted.set(window.webContents.id, { webContentsId: window.webContents.id, url })
  window.once("closed", () => trusted.delete(window.webContents.id))
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(url)
  } else {
    void window.loadFile(join(moduleDir, "../renderer/index.html"))
  }
}

function logEmbeddedRuntime(logger: Logger, versions: NodeJS.ProcessVersions): void {
  const runtime = parseEmbeddedRuntime(versions)
  if (!runtime) {
    logger.log({ action: "app.runtime", status: "error" })
    return
  }
  const meta = runtimeLogMeta(runtime)
  logger.log({
    action: "app.runtime",
    status: meta.qvacNodeOk ? "ok" : "error",
    meta,
  })
}

if (squirrelEvent) {
  handleSquirrelEvent(squirrelEvent)
} else {
  app.whenReady().then(() => {
  const logger = createLogger()
  logEmbeddedRuntime(logger, process.versions)

  session.defaultSession.setPermissionRequestHandler(
    (_contents, permission, callback) => {
      callback(permission === "media" || permission === "clipboard-sanitized-write")
    },
  )
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission) =>
      permission === "media" ||
      permission === "mediaKeySystem" ||
      permission === "clipboard-sanitized-write",
  )

  const env = resolveAppEnv({
    isPackaged: app.isPackaged,
    nodeEnv: process.env.NODE_ENV,
  })
  let audio = createAudioTempStore({ audioTempDir: defaultAudioTempDir() })
  let inferenceAdapter = env.inferenceAdapter
  let settingsFile = join(tmpdir(), "oira-dev-settings.json")
  let notesFile: string
  let config: ReturnType<typeof loadAppConfig>
  try {
    config = loadAppConfig({
      userData: app.getPath("userData"),
      temp: app.getPath("temp"),
      isPackaged: app.isPackaged,
      nodeEnv: process.env.NODE_ENV,
    })
    audio = createAudioTempStore({ audioTempDir: config.paths.audioTempDir })
    inferenceAdapter = config.env.inferenceAdapter
    settingsFile = config.paths.settingsFile
    notesFile = config.paths.databaseFile
  } catch {
    logger.log({ action: "app.config", status: "error" })
    app.quit()
    return
  }
  audio.sweepOrphans()

  const application = composeApplication(createIpcLogger(logger), {
    audio,
    inferenceAdapter,
    settingsFile,
    notesFile,
    modelCacheDir: config.paths.modelCacheDir,
    setup: createSetupService(config.paths.modelCacheDir),
    onSetupProgress: (event) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IPC_EVENTS.SETUP_PROGRESS, event)
      }
    },
    clipboard: { writeText: (text) => clipboard.writeText(text) },
    onProgress: (event) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IPC_EVENTS.INFERENCE_PROGRESS, event)
      }
    },
    onModelLifecycle: (event) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IPC_EVENTS.MODEL_LIFECYCLE, event)
      }
    },
  })
  const trustedRenderers = new Map<number, TrustedRenderer>()
  registerIpc(bindIpcMain(() => [...trustedRenderers.values()]), application)
  createWindow(trustedRenderers)

  let shutdownStarted = false
  app.on("before-quit", (event) => {
    if (shutdownStarted || !application.inferenceRuntime) return
    shutdownStarted = true
    event.preventDefault()
    void application.inferenceRuntime.shutdown().finally(() => app.quit())
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(trustedRenderers)
  })
})

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
