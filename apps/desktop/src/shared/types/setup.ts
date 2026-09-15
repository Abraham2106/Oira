export type SetupPhase =
  | "checking"
  | "blocked"
  | "ready_to_download"
  | "downloading"
  | "verifying"
  | "error"
  | "ready"

export type SetupFact = {
  id: "operatingSystem" | "memory" | "storage" | "network" | "signature"
  status: "checking" | "verified" | "unknown" | "blocked"
  detail?: string
}

export type SetupModel = {
  id: "whisper" | "qwen"
  status: "pending" | "downloading" | "verifying" | "ready" | "error"
  downloadedBytes?: number
  totalBytes?: number
  detail?: string
}

/**
 * Runtime facts reported by Main. These describe Oira's configured execution
 * path; they do not assert an operating-system privacy or compliance setting.
 */
export type RuntimePrivacyFacts = {
  inference: "local"
  remoteAiProvider: "none"
  networkUsage: "model_downloads_only"
}

export type SetupStatus = {
  phase: SetupPhase
  ready: boolean
  checks: SetupFact[]
  models: SetupModel[]
  runtime: RuntimePrivacyFacts
  message?: string
}

export type SetupProgress = {
  model: SetupModel["id"]
  downloadedBytes: number
  totalBytes: number
}
