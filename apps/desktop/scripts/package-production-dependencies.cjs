const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const { execFile } = require("node:child_process")
const { promisify } = require("node:util")
const { verifyPackagedRuntime } = require("./verify-packaged-runtime.cjs")

async function packageProductionDependencies(buildPath) {
  const pnpm = process.env.npm_execpath
  if (!pnpm || !pnpm.includes("pnpm")) throw new Error("Package Oira through pnpm package:desktop or pnpm make:desktop")
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "oira-production-"))
  try {
    const staging = path.join(temporary, "app")
    // Modern deploy derives a frozen deployment lockfile from the workspace.
    // Hoisting applies only to this staging tree, not the developer's install.
    await promisify(execFile)(process.execPath, [
      pnpm, "--filter", "oira-desktop", "--config.node-linker=hoisted",
      "--config.inject-workspace-packages=true", "deploy", "--prod", "--ignore-scripts", staging,
    ], { cwd: path.resolve(__dirname, "../../.."), windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
    // Validate outside the checkout: source-tree dependencies cannot mask omissions.
    verifyPackagedRuntime(staging)
    // Packager may leave an empty ignored node_modules directory.
    await fs.rmdir(path.join(buildPath, "node_modules")).catch((error) => {
      if (error.code !== "ENOENT") throw error
    })
    await fs.rename(path.join(staging, "node_modules"), path.join(buildPath, "node_modules"))
  } finally {
    await fs.rm(temporary, { recursive: true, force: true })
  }
}

module.exports = { packageProductionDependencies }
