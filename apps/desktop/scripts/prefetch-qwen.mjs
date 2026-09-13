/**
 * Prefetch QWEN3_4B_Q4_K_M into the cache from QVAC_CONFIG_PATH (download only).
 */
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const self = fileURLToPath(import.meta.url)
if (!process.versions.electron) {
  const electron = createRequire(import.meta.url)("electron")
  const child = spawn(electron, [self], {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  })
  child.on("exit", (code) => process.exit(code ?? 1))
} else {
  const startedAt = Date.now()
  const {
    QWEN3_4B_Q4_K_M,
    close,
    downloadAsset,
    getModelInfo,
  } = await import("@qvac/sdk")

  try {
    process.stderr.write(
      `Prefetch ${QWEN3_4B_Q4_K_M.name} (~${(QWEN3_4B_Q4_K_M.expectedSize / 1e9).toFixed(2)} GB)\n`,
    )
    await downloadAsset({
      assetSrc: QWEN3_4B_Q4_K_M,
      onProgress: (p) => {
        const mb = (n) => (n / 1e6).toFixed(1)
        const line = `  ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`
        process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
        if (p.percentage >= 100) process.stderr.write("\n")
      },
    })
    const info = await getModelInfo({ modelSrc: QWEN3_4B_Q4_K_M }).catch((err) => ({
      error: String(err),
    }))
    process.stdout.write(
      JSON.stringify(
        {
          model: QWEN3_4B_Q4_K_M.name,
          elapsedMs: Date.now() - startedAt,
          info,
          configPath: process.env.QVAC_CONFIG_PATH ?? null,
        },
        null,
        2,
      ) + "\n",
    )
  } finally {
    await close().catch(() => undefined)
  }
}
