import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron"
import { join } from "node:path"
import { createAudioService } from "./audio"
import { createAuthService } from "./auth"
import { loadAppConfig } from "./config"
import { createEncounterService } from "./encounters"
import { createExportService } from "./export"
import { registerIpc } from "./ipc"
import { createIpcLogger, createLogger } from "./logging"
import { createNotesService } from "./notes"
import {
  createPurgeService,
  createRetentionJob,
  type RetentionJob,
} from "./privacy"
import {
  createOfflineQvacRuntime,
  createQvacClient,
  createStructuringAdapter,
  createTranscriptionAdapter,
  type QvacClient,
} from "./qvac"
import { createSettingsPinStore, openAppStorage, type AppStorage } from "./storage"
import { createTranscriptionService } from "./transcription"

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
  let storage: AppStorage | undefined
  let disposeAuth: (() => void) | undefined
  let retention: RetentionJob | undefined
  let qvac: QvacClient | undefined

  try {
    const config = loadAppConfig({
      userData: app.getPath("userData"),
      temp: app.getPath("temp"),
      isPackaged: app.isPackaged,
      nodeEnv: process.env.NODE_ENV,
    })
    storage = openAppStorage(config.paths.databaseFile)
    const session = createAuthService({
      pinStore: createSettingsPinStore(storage.settings),
    })
    disposeAuth = () => session.dispose()
    const audio = createAudioService(config.paths.audioTempDir)
    qvac = createQvacClient({
      runtime: createOfflineQvacRuntime(),
      modelSrc: {
        stt: config.settings.sttModelId ?? "offline-stt",
        structuring: "offline-llm",
      },
    })
    const transcription = createTranscriptionService({
      transcripts: storage.transcripts,
      stt: createTranscriptionAdapter(qvac),
    })
    const privacy = createPurgeService({
      audio,
      encounters: storage.encounters,
      transcripts: storage.transcripts,
      notes: storage.notes,
    })
    const encounters = createEncounterService({
      repository: storage.encounters,
      audio,
      transcription,
      onDiscarded: async (id) => {
        await privacy.purgeEncounter(id)
      },
    })
    const notes = createNotesService({
      encounters,
      transcripts: storage.transcripts,
      notes: storage.notes,
      model: createStructuringAdapter(qvac),
      onApproved: (id) => privacy.purgeAudio(id),
    })
    retention = createRetentionJob({
      settings: () => config.settings,
      encounters: storage.encounters,
      purge: privacy,
    })
    void retention.run()
    retention.start()
    registerIpc((channel, listener) => {
      ipcMain.handle(channel, listener)
    }, {
      encounters,
      notes,
      exportNote: createExportService({
        getExportable: (id) => notes.getExportable(id),
        dialog: {
          async chooseSavePath({ format }) {
            const result = await dialog.showSaveDialog({
              defaultPath: format === "json" ? "nota.json" : "nota.txt",
              filters:
                format === "json"
                  ? [{ name: "JSON", extensions: ["json"] }]
                  : [{ name: "Texto", extensions: ["txt"] }],
            })
            if (result.canceled || !result.filePath) return undefined
            return result.filePath
          },
        },
        clipboard: {
          writeText: (text) => clipboard.writeText(text),
        },
      }),
      session,
      privacy,
      logger: createIpcLogger(createLogger({ logsDir: config.paths.logsDir })),
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        action: "main.boot",
        status: "error",
        errorCode:
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "DATABASE_ERROR",
      }),
    )
  }

  app.on("before-quit", () => {
    retention?.stop()
    disposeAuth?.()
    void qvac?.close()
    storage?.close()
  })

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
