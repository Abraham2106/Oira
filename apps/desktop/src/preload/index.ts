import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("notalocalPrototype", {
  usesMockBridge: true,
})
