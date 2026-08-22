/// <reference types="vite/client" />

import type { NotaLocalAPI } from "../../shared/types/notalocal-api"

declare global {
  interface Window {
    notalocal: NotaLocalAPI
  }
}

export {}
