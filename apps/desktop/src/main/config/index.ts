import { resolveAppEnv, type AppEnv } from "./env"
import {
  assertAppDirectoriesWritable,
  resolveAppDirectories,
  type AppDirectories,
} from "./paths"
import { loadSettings, saveSettings } from "./settings.service"
import type { AppSettings } from "./settings.schema"

export type AppConfig = {
  env: AppEnv
  paths: AppDirectories
  settings: AppSettings
}

export type LoadAppConfigInput = {
  userData: string
  temp: string
  isPackaged: boolean
  nodeEnv?: string
}

export function loadAppConfig(input: LoadAppConfigInput): AppConfig {
  const env = resolveAppEnv({
    isPackaged: input.isPackaged,
    nodeEnv: input.nodeEnv,
    inferenceAdapter: process.env.NOTALOCAL_INFERENCE,
  })
  const paths = resolveAppDirectories(input.userData, input.temp)
  assertAppDirectoriesWritable(paths)
  const settings = loadSettings(paths.settingsFile)
  return { env, paths, settings }
}

export { saveSettings }
export type { AppDirectories, AppEnv, AppSettings }
export { defaultSettings, parseSettings, settingsSchema } from "./settings.schema"
export { resolveAppDirectories, assertAppDirectoriesWritable } from "./paths"
export { resolveAppEnv } from "./env"
