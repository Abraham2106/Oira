import { createHash } from "node:crypto"
import fs from "node:fs"
import { mkdtemp, readFile, rm, writeFile, statfs } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MODEL_MANIFEST } from "./manifest"
import { downloadModel, isVerifiedModel } from "./download"
import { createSetupService } from "./service"

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:fs/promises")>(),
  statfs: vi.fn(),
}))

const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("model provisioning contract", () => {
  it("keeps both production models pinned with verifiable hashes", () => {
    expect(MODEL_MANIFEST).toHaveLength(2)
    for (const entry of MODEL_MANIFEST) {
      expect(entry.url).toMatch(/\/resolve\/[0-9a-f]{40}\//)
      expect(entry.expectedBytes).toBeGreaterThan(1_000_000)
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it.each([false, true])("verifies a large model, complete partial=%s", async (completePartial) => {
    const directory = await mkdtemp(join(tmpdir(), "oira-setup-"))
    temporaryDirectories.push(directory)
    const body = Buffer.alloc(2 * 1024 * 1024, 42)
    const sha256 = createHash("sha256").update(body).digest("hex")
    const entry = {
      id: "whisper" as const,
      version: "test",
      filename: "model.bin",
      url: "https://example.test/model.bin",
      expectedBytes: body.length,
      sha256,
    }
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 200 })))
    if (completePartial) await writeFile(join(directory, "model.bin.partial"), body)

    await downloadModel(directory, entry)

    expect((await readFile(join(directory, entry.filename))).equals(body)).toBe(true)
    await expect(isVerifiedModel(directory, entry)).resolves.toBe(true)
    if (completePartial) expect(fetch).not.toHaveBeenCalled()
    await writeFile(join(directory, entry.filename), Buffer.alloc(body.length, 43))
    await expect(isVerifiedModel(directory, entry)).resolves.toBe(false)
  })

  it.each([
    ["win32", 1, "blocked", "blocked"],
    ["linux", 10_000_000_000, "blocked", "verified"],
    ["win32", 10_000_000_000, "ready_to_download", "verified"],
    ["win32", null, "ready_to_download", "unknown"],
  ] as const)("checks platform %s and available bytes %s", async (platform, available, phase, storageStatus) => {
    const directory = await mkdtemp(join(tmpdir(), "oira-setup-"))
    temporaryDirectories.push(directory)
    vi.stubGlobal("process", { ...process, platform })
    vi.stubGlobal("fetch", vi.fn())
    if (available === null) vi.mocked(statfs).mockRejectedValue(new Error("unavailable"))
    else vi.mocked(statfs).mockResolvedValue({ bavail: available, bsize: 1 } as Awaited<ReturnType<typeof statfs>>)
    const service = createSetupService(directory)
    const status = await service.getStatus()
    expect(status.phase).toBe(phase)
    expect(status.ready).toBe(false)
    expect(status.checks.find((check) => check.id === "storage")?.status).toBe(storageStatus)
    expect(status.checks.find((check) => check.id === "memory")?.status).toBe("unknown")
    expect(status.runtime).toEqual({
      inference: "local",
      remoteAiProvider: "none",
      networkUsage: "model_downloads_only",
    })
    if (phase === "blocked") {
      expect((await service.provisionModels()).phase).toBe("blocked")
      expect(fetch).not.toHaveBeenCalled()
    }
  })

  it("keeps models ready when size and hash still match after a file touch", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oira-setup-"))
    temporaryDirectories.push(directory)
    vi.stubGlobal("process", { ...process, platform: "win32" })
    vi.mocked(statfs).mockResolvedValue({ bavail: 10_000_000_000, bsize: 1 } as Awaited<ReturnType<typeof statfs>>)
    const state = Object.fromEntries(MODEL_MANIFEST.map((entry) => [entry.id, {
      sha256: entry.sha256,
      size: entry.expectedBytes,
      mtimeMs: 1,
    }]))
    await writeFile(join(directory, "verified-models.json"), `${JSON.stringify(state)}\n`)
    const realStat = fs.statSync.bind(fs)
    vi.spyOn(fs, "statSync").mockImplementation((target, options) => {
      const path = String(target)
      const entry = MODEL_MANIFEST.find((candidate) => path.endsWith(candidate.filename))
      if (entry) return { size: entry.expectedBytes, mtimeMs: 99 } as fs.Stats
      return realStat(target, options as never)
    })
    const status = await createSetupService(directory).getStatus()
    expect(status.ready).toBe(true)
    expect(status.models.every((model) => model.status === "ready")).toBe(true)
  })
})
