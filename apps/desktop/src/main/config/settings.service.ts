import fs from "node:fs"
import path from "node:path"
import {
  defaultSettings,
  parseSettings,
  type AppSettings,
} from "./settings.schema"

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8")
  return JSON.parse(raw) as unknown
}

export function loadSettings(settingsFile: string): AppSettings {
  if (!fs.existsSync(settingsFile)) {
    return defaultSettings
  }
  try {
    return parseSettings(readJsonFile(settingsFile))
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid settings"
    throw new Error(`Settings file failed validation: ${reason}`)
  }
}

export function saveSettings(
  settingsFile: string,
  settings: AppSettings,
): AppSettings {
  const parsed = parseSettings(settings)
  const dir = path.dirname(settingsFile)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = `${settingsFile}.${process.pid}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(parsed, null, 2)}\n`, "utf8")
  fs.renameSync(tmp, settingsFile)
  return parsed
}
