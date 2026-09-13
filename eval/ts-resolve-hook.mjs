import { existsSync, readFileSync } from "node:fs"
import { dirname, extname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"]
const INDEX_FILES = ["index.ts", "index.tsx", "index.mts", "index.js", "index.mjs"]
const REPO_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..")

function existsUrl(url) {
  try {
    return existsSync(fileURLToPath(url))
  } catch {
    return false
  }
}

function candidates(basePath) {
  const files = []
  if (!extname(basePath)) {
    for (const extension of EXTENSIONS) files.push(basePath + extension)
  }
  for (const name of INDEX_FILES) files.push(join(basePath, name))
  return files
}

function workspacePackageUrl(specifier) {
  const match = specifier.match(/^@oira\/([^/]+)$/)
  if (!match) return null
  const pkgDir = join(REPO_ROOT, "packages", match[1])
  const pkgJson = join(pkgDir, "package.json")
  if (!existsSync(pkgJson)) return null
  const pkg = JSON.parse(readFileSync(pkgJson, "utf8"))
  const entry = typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."] ?? pkg.main
  if (!entry || typeof entry !== "string") return null
  const file = join(pkgDir, entry)
  return existsSync(file) ? pathToFileURL(file).href : null
}

export async function resolve(specifier, context, nextResolve) {
  const workspaceUrl = workspacePackageUrl(specifier)
  if (workspaceUrl) return nextResolve(workspaceUrl, context)
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND" && error.code !== "ERR_UNSUPPORTED_DIR_IMPORT") {
      throw error
    }
    if (!context.parentURL) throw error
    const isPath =
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(specifier)
    if (!isPath) throw error
    const parentDir = dirname(fileURLToPath(context.parentURL))
    const basePath = specifier.startsWith(".") ? join(parentDir, specifier) : specifier
    for (const file of candidates(basePath)) {
      const url = pathToFileURL(file).href
      if (existsUrl(url)) {
        return nextResolve(url, context)
      }
    }
    throw error
  }
}
