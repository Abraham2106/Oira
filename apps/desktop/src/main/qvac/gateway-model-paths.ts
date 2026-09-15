export type GatewayModelPaths = { whisper?: string; qwen?: string }

/** Chromium's utilityProcess env map rejects undefined values and may drop the whole env. */
export function stringEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") next[key] = value
  }
  return next
}

export function parseGatewayModelArg(argv: string[]): GatewayModelPaths {
  for (const argument of argv) {
    if (!argument.startsWith("{")) continue
    try {
      const parsed = JSON.parse(argument) as { whisper?: unknown; qwen?: unknown }
      const whisper = typeof parsed.whisper === "string" && parsed.whisper ? parsed.whisper : undefined
      const qwen = typeof parsed.qwen === "string" && parsed.qwen ? parsed.qwen : undefined
      if (whisper || qwen) return { whisper, qwen }
    } catch {
      /* argv noise */
    }
  }
  return {}
}

export function resolveGatewayModelPaths(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): GatewayModelPaths {
  const fromArgv = parseGatewayModelArg(argv)
  const whisper = env.OIRA_WHISPER_MODEL_PATH || fromArgv.whisper
  const qwen = env.OIRA_QWEN_MODEL_PATH || fromArgv.qwen
  return {
    ...(whisper ? { whisper } : {}),
    ...(qwen ? { qwen } : {}),
  }
}
