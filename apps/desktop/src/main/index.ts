import { app, BrowserWindow, ipcMain, session, shell } from "electron"
import { join } from "node:path"
import { IPC_EVENTS } from "../shared/constants/ipc-channels"
import { createAudioTempStore, defaultAudioTempDir } from "./audio"
import { loadAppConfig, resolveAppEnv } from "./config"
import {
  createIpcLogger,
  createStubIpcDeps,
  registerIpc,
  type IpcHandle,
} from "./ipc"
import { createLogger, type Logger } from "./logging"
import { parseEmbeddedRuntime, runtimeLogMeta } from "./runtime"
import { tmpdir } from "node:os"

function bindIpcMain(): IpcHandle {
  return (channel, listener) => {
    ipcMain.handle(channel, listener)
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "oira",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"))
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

app.whenReady().then(() => {
  const logger = createLogger()
  logEmbeddedRuntime(logger, process.versions)

  session.defaultSession.setPermissionRequestHandler(
    (_contents, permission, callback) => {
      callback(permission === "media")
    },
  )
  session.defaultSession.setPermissionCheckHandler(
    (_contents, permission) =>
      permission === "media" || permission === "mediaKeySystem",
  )

  const env = resolveAppEnv({
    isPackaged: app.isPackaged,
    nodeEnv: process.env.NODE_ENV,
  })
  let audio = createAudioTempStore({ audioTempDir: defaultAudioTempDir() })
  let inferenceAdapter = env.inferenceAdapter
  let settingsFile = join(tmpdir(), "oira-dev-settings.json")
  try {
    const config = loadAppConfig({
      userData: app.getPath("userData"),
      temp: app.getPath("temp"),
      isPackaged: app.isPackaged,
      nodeEnv: process.env.NODE_ENV,
    })
    audio = createAudioTempStore({ audioTempDir: config.paths.audioTempDir })
    inferenceAdapter = config.env.inferenceAdapter
    settingsFile = config.paths.settingsFile
  } catch {
    // Prototype still opens if settings/paths fail; Justin owns persistence.
  }
  audio.sweepOrphans()

  registerIpc(
    bindIpcMain(),
    createStubIpcDeps(createIpcLogger(logger), {
      audio,
      inferenceAdapter,
      settingsFile,
      onProgress: (event) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send(IPC_EVENTS.INFERENCE_PROGRESS, event)
        }
      },
    }),
  )
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
