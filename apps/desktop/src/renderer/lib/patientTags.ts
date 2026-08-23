export const PATIENT_TAGS: ReadonlyArray<string> = [
  "Calm Flower",
  "Quiet Cedar",
  "Gentle River",
  "Silver Meadow",
  "Soft Sparrow",
  "Silent Willow",
  "Warm Cloud",
  "Bright Fern",
  "Still Ocean",
  "Quiet Maple",
  "Calm Meadow",
  "Soft Cedar",
  "Silver Willow",
  "Gentle Cloud",
  "Quiet Bloom",
  "Warm Meadow",
  "Silent River",
  "Bright Willow",
  "Calm Sparrow",
  "Soft River",
  "Silver Bloom",
  "Gentle Fern",
  "Quiet Ocean",
  "Warm Cedar",
  "Still Meadow",
  "Calm Willow",
  "Soft Bloom",
  "Silver Cloud",
  "Gentle Maple",
  "Quiet Fern",
  "Warm Sparrow",
  "Silent Cedar",
  "Bright Meadow",
  "Calm River",
  "Soft Willow",
  "Silver Fern",
  "Gentle Bloom",
  "Quiet Sparrow",
  "Warm Willow",
  "Still River",
  "Calm Cedar",
  "Soft Meadow",
  "Silver Maple",
  "Gentle Sparrow",
  "Quiet Cloud",
  "Warm Fern",
  "Bright Cedar",
  "Calm Bloom",
]

export type PatientHistoryEntry = {
  id: string
  tag: string
  label: string
  visitType: string
  updatedAtMs: number
  exported: boolean
}

export function pickTag(usedTags: Iterable<string>): string {
  const used = new Set(usedTags)
  const available = PATIENT_TAGS.filter((tag) => !used.has(tag))
  const pool = available.length > 0 ? available : PATIENT_TAGS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function tagInitials(tag: string): string {
  return tag
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export type RelativeTime =
  | { kind: "justNow" }
  | { kind: "minutes"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "yesterday" }
  | { kind: "days"; count: number }
  | { kind: "oneMonth" }
  | { kind: "months"; count: number }

export function relativeTime(ms: number, nowMs = Date.now()): RelativeTime {
  const diffMinutes = Math.round((nowMs - ms) / 60_000)
  if (diffMinutes < 1) return { kind: "justNow" }
  if (diffMinutes < 60) return { kind: "minutes", count: diffMinutes }
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return { kind: "hours", count: diffHours }
  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return { kind: "yesterday" }
  if (diffDays < 30) return { kind: "days", count: diffDays }
  const diffMonths = Math.round(diffDays / 30)
  return diffMonths === 1 ? { kind: "oneMonth" } : { kind: "months", count: diffMonths }
}

export function sampleHistory(nowMs = Date.now()): PatientHistoryEntry[] {
  const hour = 3_600_000
  const day = 24 * hour
  return [
    {
      id: "seed-1",
      tag: "Quiet Cedar",
      label: "Control de presión arterial",
      visitType: "control",
      updatedAtMs: nowMs - Math.round(1.5 * hour),
      exported: true,
    },
    {
      id: "seed-2",
      tag: "Calm Flower",
      label: "Dolor lumbar",
      visitType: "primera consulta",
      updatedAtMs: nowMs - day,
      exported: true,
    },
    {
      id: "seed-3",
      tag: "Gentle River",
      label: "",
      visitType: "seguimiento",
      updatedAtMs: nowMs - 2 * day,
      exported: true,
    },
    {
      id: "seed-4",
      tag: "Silver Meadow",
      label: "Revisión de resultados",
      visitType: "control",
      updatedAtMs: nowMs - 4 * day,
      exported: true,
    },
    {
      id: "seed-5",
      tag: "Soft Sparrow",
      label: "Seguimiento posoperatorio",
      visitType: "seguimiento",
      updatedAtMs: nowMs - 9 * day,
      exported: true,
    },
    {
      id: "seed-6",
      tag: "Warm Cloud",
      label: "Consulta pediátrica",
      visitType: "primera consulta",
      updatedAtMs: nowMs - 14 * day,
      exported: true,
    },
  ]
}
