import { contextBridge, ipcRenderer } from "electron"
import {
  IPC_CHANNELS,
  IPC_EVENTS,
} from "../shared/constants/ipc-channels"
import type { InferenceProgress } from "../shared/types/inference-progress"
import type { OiraApi } from "../shared/types/oira-api"

const oira: OiraApi = {
  startEncounter: (input = {}) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_ENCOUNTER, input),
  stopEncounter: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_ENCOUNTER, input),
  appendAudio: (input) => ipcRenderer.invoke(IPC_CHANNELS.APPEND_AUDIO, input),
  generateNote: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_NOTE, input),
  saveNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_NOTE, input),
  writeClipboard: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, input),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, {}),
  saveSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, input),
  googleSignIn: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_GOOGLE_START, {}),
  signOut: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SIGN_OUT, {}),
  getAuthSession: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_SESSION_GET, {}),
  onInferenceProgress: (listener) => {
    const wrapped = (_event: unknown, payload: InferenceProgress) => {
      listener(payload)
    }
    ipcRenderer.on(IPC_EVENTS.INFERENCE_PROGRESS, wrapped)
    return () => {
      ipcRenderer.removeListener(IPC_EVENTS.INFERENCE_PROGRESS, wrapped)
    }
  },
}

contextBridge.exposeInMainWorld("oira", oira)
