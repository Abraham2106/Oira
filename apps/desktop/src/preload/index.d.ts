import type { NotaLocalAPI } from "./api"

export type { NotaLocalAPI }

declare global {
  interface Window {
    notalocal: NotaLocalAPI
  }
}

export {}
