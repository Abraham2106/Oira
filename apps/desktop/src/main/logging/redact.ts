import type { LogMetaValue } from "./log-entry"

/**
 * Allow-list for `meta` (guide §12.4). Numbers and booleans are safe by shape;
 * string keys must declare a closed set of values, because a free-form string
 * on an allow-listed key is still a channel for clinical content.
 *
 * Add a key here only together with the caller that needs it. `model` waits on
 * Q2 (the STT model constant is not decided yet).
 */
export const ALLOWED_META_KEYS = {
  attempt: "number",
  audioDurationMs: "number",
  durationMs: "number",
  filesDeleted: "number",
  segments: "number",
  cached: "boolean",
  retryable: "boolean",
  format: ["txt", "json"],
} as const satisfies Record<
  string,
  "number" | "boolean" | readonly string[]
>

export type AllowedMetaKey = keyof typeof ALLOWED_META_KEYS

export function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, LogMetaValue> | undefined {
  if (!meta) return undefined

  const safe: Record<string, LogMetaValue> = {}
  for (const [key, value] of Object.entries(meta)) {
    const spec = ALLOWED_META_KEYS[key as AllowedMetaKey] as
      | "number"
      | "boolean"
      | readonly string[]
      | undefined
    if (!spec) continue

    if (spec === "number") {
      if (typeof value === "number" && Number.isFinite(value)) safe[key] = value
      continue
    }
    if (spec === "boolean") {
      if (typeof value === "boolean") safe[key] = value
      continue
    }
    if (typeof value === "string" && spec.includes(value)) safe[key] = value
  }

  return Object.keys(safe).length > 0 ? safe : undefined
}

/** Opaque IDs are allowed; anything that is not a UUID is not an ID. */
export function sanitizeEncounterId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : undefined
}
