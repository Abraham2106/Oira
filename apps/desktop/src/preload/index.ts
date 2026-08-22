import { contextBridge, ipcRenderer } from "electron"
import { IPC_CHANNELS } from "../shared/constants/ipc-channels"
import type { NotaLocalAPI } from "../shared/types/notalocal-api"

const notalocal: NotaLocalAPI = {
  startEncounter: (input = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_ENCOUNTER, input),
  stopEncounter: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_ENCOUNTER, input),
  generateNote: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_NOTE, input),
  saveNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_NOTE, input),
}

contextBridge.exposeInMainWorld("notalocal", notalocal)
contextBridge.exposeInMainWorld("notalocalPrototype", {
  usesMockBridge: true,
})
