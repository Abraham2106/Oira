export type GpuDescriptor = {
  id: string
  name: string
  vendor?: string
  index: number
  vramBytes?: number
  cuda?: boolean
}

export type DeviceSelection = {
  identity: { id: string; name: string; vendor?: string }
  /** Requested backend index; resource metadata alone does not confirm execution. */
  whisperGpuDevice?: number
  llmMainGpu: number | "dedicated" | "integrated"
  requestedLabel: string
  fallbackReason?: string
}

type ResourceMetric<T> =
  | { status: "supported"; value: T }
  | { status: string; reason?: string }

function metricValue<T>(metric: ResourceMetric<T> | T | undefined): T | undefined {
  if (metric == null) return undefined
  if (typeof metric === "object" && "status" in metric) {
    return metric.status === "supported" && "value" in metric ? metric.value : undefined
  }
  return metric
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined
  return value as Record<string, unknown>
}

function readGpuList(node: unknown): unknown[] | undefined {
  const record = asRecord(node)
  if (!record) return undefined
  const gpus = record.gpus
  if (Array.isArray(gpus)) return gpus
  const metric = asRecord(gpus)
  if (!metric) return undefined
  if (metric.status === "supported" && Array.isArray(metric.value)) return metric.value
  return undefined
}

function readBytes(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
  const metric = metricValue(value as ResourceMetric<number> | number | undefined)
  if (typeof metric === "number" && Number.isFinite(metric) && metric >= 0) return metric
  if (typeof value === "string") {
    const match = value.trim().match(/^([\d.]+)\s*(gi?b|mi?b|ki?b|b)?$/i)
    if (!match) return undefined
    const amount = Number(match[1])
    if (!Number.isFinite(amount)) return undefined
    const unit = (match[2] ?? "b").toLowerCase()
    if (unit.startsWith("g")) return amount * 1024 ** 3
    if (unit.startsWith("m")) return amount * 1024 ** 2
    if (unit.startsWith("k")) return amount * 1024
    return amount
  }
  return undefined
}

function extractVramBytes(record: Record<string, unknown>): number | undefined {
  for (const key of ["vramBytes", "vram", "memoryTotalBytes", "dedicatedMemory", "dedicatedVideoMemory", "memoryTotal", "totalMemory"]) {
    const bytes = readBytes(record[key])
    if (bytes != null) return bytes
  }
  const memory = asRecord(record.memory) ?? asRecord(record.vram)
  if (!memory) return undefined
  return (
    readBytes(memory.total)
    ?? readBytes(memory.totalBytes)
    ?? readBytes(memory.memoryTotalBytes)
    ?? readBytes(memory.dedicated)
    ?? readBytes(memory.free)
  )
}

function extractCuda(record: Record<string, unknown>): boolean | undefined {
  const drivers = asRecord(record.drivers)
  const cuda = metricValue(drivers?.cuda as ResourceMetric<boolean> | boolean | undefined)
  return typeof cuda === "boolean" ? cuda : undefined
}

function parseGpuRow(row: unknown, index: number): GpuDescriptor | undefined {
  const record = asRecord(row)
  if (!record) return undefined
  const name = metricValue(record.name as ResourceMetric<string> | string | undefined)
  const vendor = metricValue(record.vendor as ResourceMetric<string> | string | undefined)
  const id = typeof record.id === "string" && record.id.length > 0 ? record.id : `gpu-${index}`
  const vramBytes = extractVramBytes(record)
  const cuda = extractCuda(record)
  if (!name && !vendor && vramBytes == null && cuda == null) return undefined
  return {
    id,
    name: name ?? vendor ?? id,
    vendor,
    index,
    vramBytes,
    cuda,
  }
}

/** Pull GPU rows from QVAC `getSystemResources()` without assuming a single nest path. */
export function extractGpusFromSystemResources(resources: unknown): GpuDescriptor[] {
  const root = asRecord(resources)
  if (!root) return []
  const capabilityRows = readGpuList(root.capabilities) ?? []
  const sampleRows = readGpuList(root.sample) ?? []
  const fallbackRows = readGpuList(root) ?? []
  const rows = capabilityRows.length > 0 ? capabilityRows : fallbackRows
  const samples = sampleRows.map((row, index) => parseGpuRow(row, index)).filter(
    (gpu): gpu is GpuDescriptor => gpu != null,
  )
  const gpus: GpuDescriptor[] = []
  rows.forEach((row, index) => {
    const parsed = parseGpuRow(row, index)
    if (!parsed) return
    const sample = samples.find((item) => item.id === parsed.id || item.name === parsed.name)
    gpus.push({
      ...parsed,
      vramBytes: parsed.vramBytes ?? sample?.vramBytes,
      cuda: parsed.cuda ?? sample?.cuda,
    })
  })
  if (gpus.length === 0) return samples
  return gpus
}

function haystack(gpu: GpuDescriptor): string {
  return `${gpu.name} ${gpu.vendor ?? ""}`.toLowerCase()
}

function isIntegrated(gpu: GpuDescriptor): boolean {
  const text = haystack(gpu)
  const intelDedicated = text.includes("intel") && text.includes("arc")
  return (
    text.includes("integrated")
    || (text.includes("intel") && !intelDedicated)
    || (text.includes("radeon") && (text.includes("graphics") || text.includes("vega")))
  )
}

/** Known VRAM wins; unknown iGPU ranks at 0; unknown discrete ranks above any iGPU. */
export function vramRank(gpu: GpuDescriptor): number {
  if (gpu.vramBytes != null) return gpu.vramBytes
  return isIntegrated(gpu) ? 0 : Number.POSITIVE_INFINITY
}

function formatVram(bytes: number): string {
  const gib = bytes / 1024 ** 3
  if (gib >= 1) return `${gib >= 10 ? Math.round(gib) : gib.toFixed(1)} GiB`
  return `${Math.round(bytes / 1024 ** 2)} MiB`
}

/**
 * Prefer a discrete adapter for Whisper's numeric `gpu_device`.
 * Qwen uses the addon's class selector (`dedicated` / `integrated`), not CUDA.
 */
export function selectPreferredGpu(
  gpus: readonly GpuDescriptor[],
): DeviceSelection | undefined {
  const discrete = gpus.filter((gpu) => !isIntegrated(gpu))
  const pool = discrete.length > 0 ? discrete : gpus
  const ranked = [...pool].sort((left, right) => {
    const delta = vramRank(right) - vramRank(left)
    return delta !== 0 ? delta : left.index - right.index
  })
  const chosen = ranked[0]
  if (!chosen) return undefined
  const vram = chosen.vramBytes != null ? ` · ${formatVram(chosen.vramBytes)}` : ""
  return {
    identity: { id: chosen.id, name: chosen.name, vendor: chosen.vendor },
    whisperGpuDevice: chosen.index,
    llmMainGpu: discrete.length > 0 ? "dedicated" : "integrated",
    requestedLabel: `${chosen.name}${vram}`,
  }
}
