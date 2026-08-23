import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import { IPC_CHANNELS } from "../shared/constants/ipc-channels"
import type { NotaLocalAPI } from "./api"

const api: NotaLocalAPI = {
  startEncounter: () => ipcRenderer.invoke(IPC_CHANNELS.START_ENCOUNTER, {}),
  stopEncounter: (input) => ipcRenderer.invoke(IPC_CHANNELS.STOP_ENCOUNTER, input),
  getEncounter: (input) => ipcRenderer.invoke(IPC_CHANNELS.GET_ENCOUNTER, input),
  discardEncounter: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.DISCARD_ENCOUNTER, input),
  cancelTranscription: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_TRANSCRIPTION, input),
  pushAudioChunk: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.PUSH_AUDIO_CHUNK, input),
  generateNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.GENERATE_NOTE, input),
  saveNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_NOTE, input),
  exportNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_NOTE, input),
  unlock: (input) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_UNLOCK, input),
  lock: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOCK, {}),
  setPin: (input) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SET_PIN, input),
  authStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_STATUS, {}),
  storageInventory: () => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_INVENTORY, {}),
  onEvent: (callback) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => {
      callback(payload)
    }
    ipcRenderer.on(IPC_CHANNELS.EVENT, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT, listener)
    }
  },
}

contextBridge.exposeInMainWorld("notalocal", api)
