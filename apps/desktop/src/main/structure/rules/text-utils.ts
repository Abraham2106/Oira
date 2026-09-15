/** Utilidades de texto locales para las reglas (espejo de eval/scorer, no importa el eval). */
export function normalizeText(value: string | undefined | null): string {
  if (typeof value !== "string") return ""
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function containsNormalized(haystack: string, needle: string): boolean {
  const h = normalizeText(haystack)
  const n = normalizeText(needle)
  if (!n) return false
  return h.includes(n)
}

/** Tokeniza en palabras normalizadas. */
export function tokens(text: string): string[] {
  const normalized = normalizeText(text)
  return normalized ? normalized.split(/[^a-z0-9]+/).filter(Boolean) : []
}