import type { SetupModel } from "../../shared/types/setup"

export type ModelManifestEntry = {
  id: SetupModel["id"]
  version: string
  filename: string
  url: string
  expectedBytes: number
  sha256: string
}

/**
 * Pinned public model artifacts. Downloading is local provisioning; inference
 * still runs through QVAC against these files on the user's device.
 */
export const MODEL_MANIFEST: readonly ModelManifestEntry[] = [
  {
    id: "whisper",
    version: "2024-10-01",
    filename: "ggml-large-v3-turbo.bin",
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-large-v3-turbo.bin",
    expectedBytes: 1_624_555_275,
    sha256: "1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69",
  },
  {
    id: "qwen",
    version: "2025-05-13",
    filename: "Qwen3-4B-Q4_K_M.gguf",
    url: "https://huggingface.co/unsloth/Qwen3-4B-GGUF/resolve/22c9fc8a8c7700b76a1789366280a6a5a1ad1120/Qwen3-4B-Q4_K_M.gguf",
    expectedBytes: 2_497_281_312,
    sha256: "f6f851777709861056efcdad3af01da38b31223a3ba26e61a4f8bf3a2195813a",
  },
]

export function manifestEntry(id: SetupModel["id"]): ModelManifestEntry {
  const entry = MODEL_MANIFEST.find((candidate) => candidate.id === id)
  if (!entry) throw new Error(`Unknown setup model: ${id}`)
  return entry
}
