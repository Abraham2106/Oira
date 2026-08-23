export type NodeEnv = "development" | "production" | "test"

export type InferenceAdapterName = "mock" | "qvac"

export type AppEnv = {
  nodeEnv: NodeEnv
  isDev: boolean
  isPackaged: boolean
  /** §16.2: unattended model download is development-only. */
  allowUnattendedModelDownload: boolean
  /** Product toggle is env, not Settings. Tests always force mock. Default is qvac. */
  inferenceAdapter: InferenceAdapterName
}

function normalizeInferenceAdapter(
  value: string | undefined,
): InferenceAdapterName {
  return value === "mock" ? "mock" : "qvac"
}

function normalizeNodeEnv(value: string | undefined): NodeEnv {
  if (value === "production" || value === "test") return value
  return "development"
}

export function resolveAppEnv(input: {
  isPackaged: boolean
  nodeEnv?: string
  inferenceAdapter?: string
}): AppEnv {
  const nodeEnv = normalizeNodeEnv(input.nodeEnv ?? process.env.NODE_ENV)
  const requested = normalizeInferenceAdapter(
    input.inferenceAdapter ?? process.env.NOTALOCAL_INFERENCE,
  )
  return {
    nodeEnv,
    isDev: !input.isPackaged && nodeEnv !== "production",
    isPackaged: input.isPackaged,
    allowUnattendedModelDownload: !input.isPackaged && nodeEnv !== "production",
    inferenceAdapter: nodeEnv === "test" ? "mock" : requested,
  }
}
