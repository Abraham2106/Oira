import os from "node:os"
import fs from "node:fs"
import { statfs } from "node:fs/promises"
import { join } from "node:path"
import type {
  SetupProgress,
  SetupStatus,
} from "../../shared/types/setup"
import { MODEL_MANIFEST } from "./manifest"
import { downloadModel, isVerifiedModel } from "./download"

type StoredModel = {
  sha256: string
  size: number
  mtimeMs: number
}

type StoredState = Record<string, StoredModel>

export type SetupService = {
  getStatus: () => Promise<SetupStatus>
  provisionModels: (onProgress?: (progress: SetupProgress) => void) => Promise<SetupStatus>
}

function statePath(directory: string): string {
  return join(directory, "verified-models.json")
}

function readState(directory: string): StoredState {
  try {
    return JSON.parse(fs.readFileSync(statePath(directory), "utf8")) as StoredState
  } catch {
    return {}
  }
}

function writeState(directory: string, state: StoredState): void {
  const temporary = `${statePath(directory)}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  fs.renameSync(temporary, statePath(directory))
}

async function freeBytes(directory: string): Promise<number | null> {
  try {
    const info = await statfs(directory)
    return Number(info.bavail) * Number(info.bsize)
  } catch {
    return null
  }
}

export function createSetupService(directory: string): SetupService {
  const isReadyFromState = (id: string, state: StoredState): boolean => {
    const entry = MODEL_MANIFEST.find((candidate) => candidate.id === id)
    const saved = state[id]
    if (!entry || !saved) return false
    const file = join(directory, entry.filename)
    try {
      const current = fs.statSync(file)
      return saved.sha256 === entry.sha256 &&
        current.size === entry.expectedBytes &&
        saved.size === current.size
    } catch {
      return false
    }
  }

  const getStatus = async (): Promise<SetupStatus> => {
    fs.mkdirSync(directory, { recursive: true })
    const state = readState(directory)
    const models = MODEL_MANIFEST.map((entry) => ({
      id: entry.id,
      status: isReadyFromState(entry.id, state) ? "ready" as const : "pending" as const,
      detail: `${entry.version} · ${Math.round(entry.expectedBytes / 1_000_000)} MB`,
    }))
    const available = await freeBytes(directory)
    const requiredBytes = MODEL_MANIFEST.reduce((total, entry) =>
      total + (isReadyFromState(entry.id, state) ? 0 : entry.expectedBytes), 0)
    const storageBlocked = available !== null && available < requiredBytes
    const blocked = process.platform !== "win32" || storageBlocked
    const ready = !blocked && models.every((model) => model.status === "ready")
    return {
      phase: blocked ? "blocked" : ready ? "ready" : "ready_to_download",
      ready,
      checks: [
        {
          id: "operatingSystem",
          status: process.platform === "win32" ? "verified" : "blocked",
          detail: `${process.platform} ${process.arch}`,
        },
        {
          id: "memory",
          status: "unknown",
          detail: `${Math.round(os.freemem() / 1_000_000_000)} GB libres; requisito mínimo aún no validado`,
        },
        {
          id: "storage",
          status: available === null ? "unknown" : storageBlocked ? "blocked" : "verified",
          detail: available === null ? undefined : `${(available / 1_000_000_000).toFixed(2)} GB libres; ${(requiredBytes / 1_000_000_000).toFixed(2)} GB requeridos para preparar modelos`,
        },
        { id: "network", status: "unknown" },
        { id: "signature", status: "unknown" },
      ],
      models,
      runtime: {
        inference: "local",
        remoteAiProvider: "none",
        networkUsage: "model_downloads_only",
      },
    }
  }

  const provisionModels = async (
    onProgress?: (progress: SetupProgress) => void,
  ): Promise<SetupStatus> => {
    const status = await getStatus()
    if (status.phase === "blocked") return status
    fs.mkdirSync(directory, { recursive: true })
    const state = readState(directory)
    for (const entry of MODEL_MANIFEST) {
      if (isReadyFromState(entry.id, state) && await isVerifiedModel(directory, entry)) continue
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await downloadModel(directory, entry, (progress) => {
            onProgress?.({ model: entry.id, ...progress })
          })
          const file = fs.statSync(join(directory, entry.filename))
          state[entry.id] = {
            sha256: entry.sha256,
            size: file.size,
            mtimeMs: file.mtimeMs,
          }
          writeState(directory, state)
          break
        } catch (error) {
          if (attempt === 3) throw error
        }
      }
    }
    return getStatus()
  }

  return { getStatus, provisionModels }
}
