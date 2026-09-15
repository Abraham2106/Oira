import { copyFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const packageDir = dirname(require.resolve("electron-winstaller/package.json"))
const vendorDir = join(packageDir, "vendor")
const hostArch = process.arch === "arm64" ? "arm64" : "x64"

await Promise.all([
  copyFile(join(vendorDir, `7z-${hostArch}.exe`), join(vendorDir, "7z.exe")),
  copyFile(join(vendorDir, `7z-${hostArch}.dll`), join(vendorDir, "7z.dll")),
])
