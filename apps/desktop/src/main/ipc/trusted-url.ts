/** Normalize renderer document URLs so Vite and Chromium compare as the same window. */
export function canonicalDocumentUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value)
    parsed.hash = ""
    parsed.username = ""
    parsed.password = ""
    if (parsed.pathname === "") parsed.pathname = "/"
    return parsed.href
  } catch {
    return undefined
  }
}

export function isSameTrustedDocument(left: string, right: string): boolean {
  const canonicalLeft = canonicalDocumentUrl(left)
  const canonicalRight = canonicalDocumentUrl(right)
  return Boolean(canonicalLeft && canonicalRight && canonicalLeft === canonicalRight)
}

/** Dev Vite may add a trailing slash or stay on the same origin; packaged file URLs stay exact. */
export function isAllowedRendererNavigation(candidate: string, trusted: string): boolean {
  if (isSameTrustedDocument(candidate, trusted)) return true
  try {
    const next = new URL(candidate)
    const allowed = new URL(trusted)
    return (
      next.origin === allowed.origin
      && (allowed.protocol === "http:" || allowed.protocol === "https:")
    )
  } catch {
    return false
  }
}
