import { app, BrowserWindow, ipcMain, shell } from "electron"
import { join } from "node:path"
import { loadAppConfig } from "./config"
import {
  createJsonIpcLogger,
  createStubIpcDeps,
  registerIpc,
  type IpcHandle,
} from "./ipc"

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
    title: "NotaLocal",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
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

app.whenReady().then(() => {
  try {
    loadAppConfig({
      userData: app.getPath("userData"),
      temp: app.getPath("temp"),
      isPackaged: app.isPackaged,
      nodeEnv: process.env.NODE_ENV,
    })
  } catch {
    // Prototype still opens if settings/paths fail; Justin owns persistence.
  }

  registerIpc(bindIpcMain(), createStubIpcDeps(createJsonIpcLogger()))
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
