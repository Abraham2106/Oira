import { appendFileSync } from "node:fs"

export const HISTORY_FIELDS = [
  "timestamp",
  "commit_sha",
  "adapter",
  "layer",
  "wer",
  "cer",
  "presence_accuracy",
  "macro_f1",
  "invencion_lexica",
  "latencia_p50",
  "total_casos",
  "casos_con_error",
]

const nullableString = (value) => value === null || typeof value === "string"
const nullableNumber = (value) => value === null || (typeof value === "number" && Number.isFinite(value))

export function isHistoryEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  if (Object.keys(value).length !== HISTORY_FIELDS.length) return false
  if (!HISTORY_FIELDS.every((field) => Object.hasOwn(value, field))) return false
  return (
    typeof value.timestamp === "string" &&
    nullableString(value.commit_sha) &&
    typeof value.adapter === "string" &&
    nullableString(value.layer) &&
    nullableNumber(value.wer) &&
    nullableNumber(value.cer) &&
    nullableNumber(value.presence_accuracy) &&
    nullableNumber(value.macro_f1) &&
    nullableNumber(value.invencion_lexica) &&
    nullableNumber(value.latencia_p50) &&
    nullableNumber(value.total_casos) &&
    nullableNumber(value.casos_con_error)
  )
}

export function historyEntry(metadata, summary) {
  return {
    timestamp: metadata.startedAt,
    commit_sha: metadata.gitCommit ?? null,
    adapter: metadata.adapter,
    layer: metadata.layer ?? null,
    wer: summary.stt?.meanWer ?? null,
    cer: summary.stt?.meanCer ?? null,
    presence_accuracy: summary.presence?.accuracy ?? null,
    macro_f1: summary.presence?.macroF1 ?? null,
    invencion_lexica: summary.invention?.rate ?? null,
    latencia_p50: summary.latency?.p50 ?? null,
    total_casos: summary.cases ?? null,
    casos_con_error: summary.errors ?? null,
  }
}

export function appendHistory(path, entry) {
  if (!isHistoryEntry(entry)) throw new Error("Entrada de history.jsonl inválida.")
  appendFileSync(path, `${JSON.stringify(entry)}\n`, "utf8")
}
