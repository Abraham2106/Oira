import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MODEL_MANIFEST } from "./manifest"
import { downloadModel, isVerifiedModel } from "./download"

const temporaryDirectories: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
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

  it("writes only a hash-verified file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "oira-setup-"))
    temporaryDirectories.push(directory)
    const body = Buffer.from("synthetic model")
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

    await downloadModel(directory, entry)

    expect(await readFile(join(directory, entry.filename))).toEqual(body)
    await expect(isVerifiedModel(directory, entry)).resolves.toBe(true)
  })
})
