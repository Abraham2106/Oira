export type NodeEnv = "development" | "production" | "test"

export type AppEnv = {
  nodeEnv: NodeEnv
  isDev: boolean
  isPackaged: boolean
  /** §16.2: unattended model download is development-only. */
  allowUnattendedModelDownload: boolean
}

function normalizeNodeEnv(value: string | undefined): NodeEnv {
  if (value === "production" || value === "test") return value
  return "development"
}

export function resolveAppEnv(input: {
  isPackaged: boolean
  nodeEnv?: string
}): AppEnv {
  const nodeEnv = normalizeNodeEnv(input.nodeEnv ?? process.env.NODE_ENV)
  return {
    nodeEnv,
    isDev: !input.isPackaged && nodeEnv !== "production",
    isPackaged: input.isPackaged,
    allowUnattendedModelDownload: !input.isPackaged && nodeEnv !== "production",
  }
}
