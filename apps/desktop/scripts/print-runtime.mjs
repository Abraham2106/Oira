import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import process from "node:process"

const electron = createRequire(import.meta.url)("electron")

const result = spawnSync(
  electron,
  [
    "-e",
    "process.stdout.write(process.versions.node + ' electron/' + process.versions.electron + '\\n')",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  },
)

process.exit(result.status ?? 1)
