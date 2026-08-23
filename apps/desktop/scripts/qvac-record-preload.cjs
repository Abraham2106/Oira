const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("notalocalRecord", {
  transcribePcm: (pcm) => ipcRenderer.invoke("transcribe-pcm", pcm),
})
