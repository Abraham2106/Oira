import fs from "node:fs"
import path from "node:path"

export type AppDirectories = {
  userData: string
  systemTemp: string
  databaseFile: string
  modelCacheDir: string
  audioTempDir: string
  logsDir: string
  settingsFile: string
}

export function resolveAppDirectories(
  userData: string,
  systemTemp: string,
): AppDirectories {
  return {
    userData,
    systemTemp,
    databaseFile: path.join(userData, "notalocal.sqlite"),
    modelCacheDir: path.join(userData, "model-cache"),
    audioTempDir: path.join(userData, "tmp-audio"),
    logsDir: path.join(userData, "logs"),
    settingsFile: path.join(userData, "settings.json"),
  }
}

export function assertDirectoryWritable(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
  const probe = path.join(dir, `.write-probe-${process.pid}`)
  try {
    fs.writeFileSync(probe, "")
    fs.unlinkSync(probe)
  } catch {
    throw new Error(`Directory is not writable: ${dir}`)
  }
}

export function assertAppDirectoriesWritable(dirs: AppDirectories): void {
  assertDirectoryWritable(dirs.userData)
  assertDirectoryWritable(dirs.modelCacheDir)
  assertDirectoryWritable(dirs.audioTempDir)
  assertDirectoryWritable(dirs.logsDir)
}
