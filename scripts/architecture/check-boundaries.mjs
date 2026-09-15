import { builtinModules, createRequire } from "node:module"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const requireDesktopDependency = createRequire(
  path.resolve(import.meta.dirname, "..", "..", "apps", "desktop", "package.json"),
)
const ts = requireDesktopDependency("typescript")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"])
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/
const NODE_BUILT_INS = new Set(builtinModules.map((name) => name.replace(/^node:/, "")))
const PRIVILEGED_IDENTIFIERS = new Set(["ipcRenderer", "require", "fs"])

function toPosix(value) {
  return value.split(path.sep).join("/")
}

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [fullPath] : []
  })
}

function resolveRelative(file, specifier) {
  const candidate = path.resolve(path.dirname(file), specifier)
  const candidates = [
    candidate,
    ...[".ts", ".tsx"].map((extension) => `${candidate}${extension}`),
    ...["index.ts", "index.tsx"].map((name) => path.join(candidate, name)),
  ]
  return candidates.find(existsSync) ?? candidate
}

function violation(file, sourceFile, node, message, root) {
  return {
    file: toPosix(path.relative(root, file)),
    line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
    message,
  }
}

function moduleSpecifier(node) {
  return ts.isStringLiteral(node) ? node.text : undefined
}

function importedModules(sourceFile) {
  const imports = []
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier && moduleSpecifier(node.moduleSpecifier)
      if (specifier) imports.push({ specifier, node: node.moduleSpecifier })
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const specifier = moduleSpecifier(node.moduleReference.expression)
      if (specifier) imports.push({ specifier, node: node.moduleReference.expression })
    } else if (ts.isCallExpression(node)) {
      const argument = node.arguments[0]
      const specifier = argument && moduleSpecifier(argument)
      if (
        specifier &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        imports.push({ specifier, node: argument })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return imports
}

function isWindowOira(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return (
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "window" || node.expression.text === "globalThis") &&
      node.name.text === "oira"
    )
  }
  if (ts.isElementAccessExpression(node)) {
    return (
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "window" || node.expression.text === "globalThis") &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "oira"
    )
  }
  return false
}

function variableInitializers(sourceFile) {
  const values = new Map()
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      values.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return values
}

function exposesPrivilegedValue(node, values, seen = new Set()) {
  if (ts.isIdentifier(node)) {
    if (PRIVILEGED_IDENTIFIERS.has(node.text)) return true
    if (seen.has(node.text)) return false
    const initializer = values.get(node.text)
    if (!initializer) return false
    seen.add(node.text)
    return exposesPrivilegedValue(initializer, values, seen)
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.some((property) => {
      if (ts.isShorthandPropertyAssignment(property)) {
        return PRIVILEGED_IDENTIFIERS.has(property.name.text)
      }
      return ts.isPropertyAssignment(property) && exposesPrivilegedValue(property.initializer, values, seen)
    })
  }
  return false
}

function preloadExposesPrivilege(sourceFile) {
  const values = variableInitializers(sourceFile)
  const exposures = []
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "contextBridge" &&
      node.expression.name.text === "exposeInMainWorld" &&
      node.arguments[1] &&
      exposesPrivilegedValue(node.arguments[1], values)
    ) {
      exposures.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return exposures
}

function isNodeBuiltIn(specifier) {
  return specifier.startsWith("node:") || NODE_BUILT_INS.has(specifier)
}

export function checkBoundaries(root) {
  const src = path.join(root, "apps", "desktop", "src")
  const renderer = path.join(src, "renderer")
  const main = path.join(src, "main")
  const qvac = path.join(main, "qvac")
  const preload = path.join(src, "preload")
  const violations = []
  const mainInferenceBoundary = new Set([
    "main/index.ts",
    "main/inference/select.ts",
  ])

  for (const file of walk(src).filter((source) => !TEST_FILE.test(source))) {
    const text = readFileSync(file, "utf8")
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const relative = toPosix(path.relative(src, file))
    const inRenderer = file.startsWith(`${renderer}${path.sep}`)
    const inQvac = file.startsWith(`${qvac}${path.sep}`)

    for (const item of importedModules(sourceFile)) {
      if (mainInferenceBoundary.has(relative) &&
        (item.specifier === "@qvac/sdk" || item.specifier.endsWith("/qvac/sdk") ||
          item.specifier.endsWith("/qvac/inference-runtime"))) {
        violations.push(violation(file, sourceFile, item.node, "Electron Main composition cannot import QVAC SDK or runtime.", root))
      }
      if (item.specifier === "@qvac/sdk" && !inQvac) {
        violations.push(violation(file, sourceFile, item.node, "@qvac/sdk is restricted to src/main/qvac/.", root))
      }
      if (!inRenderer) continue
      if (item.specifier === "electron" || isNodeBuiltIn(item.specifier)) {
        violations.push(violation(file, sourceFile, item.node, "Renderer code cannot import Electron or Node built-ins.", root))
      } else if (item.specifier.startsWith(".")) {
        const target = resolveRelative(file, item.specifier)
        if (target === main || target.startsWith(`${main}${path.sep}`)) {
          violations.push(violation(file, sourceFile, item.node, "Renderer code cannot import src/main/.", root))
        }
      }
    }

    if (inRenderer && !relative.startsWith("renderer/bridge/")) {
      function visit(node) {
        if (isWindowOira(node)) {
          violations.push(violation(file, sourceFile, node, "Only src/renderer/bridge/ may access window.oira.", root))
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
    }

    if (file.startsWith(`${preload}${path.sep}`)) {
      for (const exposure of preloadExposesPrivilege(sourceFile)) {
        violations.push(violation(file, sourceFile, exposure, "Preload cannot expose ipcRenderer, require, or fs directly.", root))
      }
    }
  }
  return violations
}

export function formatViolations(violations) {
  return violations.map((item) => `${item.file}:${item.line} ${item.message}`).join("\n")
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(import.meta.dirname, "..", "..")
  const violations = checkBoundaries(root)
  if (violations.length === 0) {
    process.stdout.write("Architecture boundaries: OK\n")
    return
  }
  process.stderr.write(`${formatViolations(violations)}\n`)
  process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
