import { createHash } from "node:crypto"
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs"
import { createWriteStream } from "node:fs"
import { rename, unlink } from "node:fs/promises"
import { basename, join } from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ModelManifestEntry } from "./manifest"

export type DownloadProgress = {
  downloadedBytes: number
  totalBytes: number
}

async function fileHash(filePath: string): Promise<string> {
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest("hex")
}

export async function isVerifiedModel(
  directory: string,
  entry: ModelManifestEntry,
): Promise<boolean> {
  const target = join(directory, entry.filename)
  if (!existsSync(target) || statSync(target).size !== entry.expectedBytes) return false
  return (await fileHash(target)) === entry.sha256
}

export async function downloadModel(
  directory: string,
  entry: ModelManifestEntry,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  // Defense in depth: the manifest is bundled, but a manipulated entry must
  // never turn the updater into an arbitrary-file downloader/writer.
  let parsedUrl: URL
  try {
    parsedUrl = new URL(entry.url)
  } catch {
    throw new Error(`Model download refused: invalid URL for ${entry.filename}`)
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`Model download refused: non-https URL for ${entry.filename}`)
  }
  if (basename(entry.filename) !== entry.filename || entry.filename.includes("\0")) {
    throw new Error(`Model download refused: unsafe filename ${entry.filename}`)
  }
  mkdirSync(directory, { recursive: true })
  const target = join(directory, entry.filename)
  const partial = `${target}.partial`
  let offset = existsSync(partial) ? statSync(partial).size : 0
  if (offset > entry.expectedBytes) {
    await unlink(partial).catch(() => undefined)
    offset = 0
  }
  if (offset === entry.expectedBytes) {
    if ((await fileHash(partial)) === entry.sha256) {
      await rename(partial, target)
      return target
    }
    await unlink(partial)
    offset = 0
  }

  const response = await fetch(entry.url, {
    headers: offset > 0 ? { Range: `bytes=${offset}-` } : undefined,
    redirect: "follow",
  })
  if (!response.ok || !response.body) throw new Error(`Model download failed: HTTP ${response.status}`)
  const resumed = offset > 0 && response.status === 206
  if (!resumed) offset = 0

  let received = offset
  const progress = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length
      onProgress?.({ downloadedBytes: received, totalBytes: entry.expectedBytes })
      callback(null, chunk)
    },
  })
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    progress,
    createWriteStream(partial, resumed ? { flags: "a" } : {}),
  )

  if (statSync(partial).size !== entry.expectedBytes) {
    throw new Error(`Model download incomplete: ${basename(entry.filename)}`)
  }
  if ((await fileHash(partial)) !== entry.sha256) {
    await unlink(partial).catch(() => undefined)
    throw new Error(`Model integrity check failed: ${basename(entry.filename)}`)
  }
  await rename(partial, target)
  return target
}
