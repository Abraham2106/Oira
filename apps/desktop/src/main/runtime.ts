/** QVAC JS/TS SDK: Node >= v22.17. Electron 37 embeds 22.16. */
export const QVAC_MIN_NODE = { major: 22, minor: 17, patch: 0 } as const

export type SemverTriple = {
  major: number
  minor: number
  patch: number
}

export type EmbeddedRuntime = {
  node: SemverTriple
  electron: SemverTriple
}

export function parseSemverTriple(value: string | undefined): SemverTriple | null {
  if (!value) return null
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function compareSemver(left: SemverTriple, right: SemverTriple): number {
  if (left.major !== right.major) return left.major - right.major
  if (left.minor !== right.minor) return left.minor - right.minor
  return left.patch - right.patch
}

export function meetsQvacNodeFloor(node: SemverTriple): boolean {
  return compareSemver(node, QVAC_MIN_NODE) >= 0
}

export function parseEmbeddedRuntime(versions: {
  node?: string
  electron?: string
}): EmbeddedRuntime | null {
  const node = parseSemverTriple(versions.node)
  const electron = parseSemverTriple(versions.electron)
  if (!node || !electron) return null
  return { node, electron }
}

export function runtimeLogMeta(runtime: EmbeddedRuntime): {
  nodeMajor: number
  nodeMinor: number
  nodePatch: number
  electronMajor: number
  electronMinor: number
  electronPatch: number
  qvacNodeOk: boolean
} {
  return {
    nodeMajor: runtime.node.major,
    nodeMinor: runtime.node.minor,
    nodePatch: runtime.node.patch,
    electronMajor: runtime.electron.major,
    electronMinor: runtime.electron.minor,
    electronPatch: runtime.electron.patch,
    qvacNodeOk: meetsQvacNodeFloor(runtime.node),
  }
}
