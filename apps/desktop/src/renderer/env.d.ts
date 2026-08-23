/// <reference types="vite/client" />

import type { OiraApi } from "../../shared/types/oira-api"

declare global {
  interface Window {
    oira: OiraApi
  }
}

export {}
