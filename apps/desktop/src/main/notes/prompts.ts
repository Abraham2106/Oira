/** Versioned template slot. Clinical wording is owned by the IA role. */
export const STRUCTURING_PROMPT_VERSION = "v1-placeholder"

const TEMPLATES: Record<string, string> = {
  [STRUCTURING_PROMPT_VERSION]:
    "Return a JSON object of structured clinical facts. Omit anything not in the transcript. Do not invent.",
}

export function loadStructuringPrompt(
  version: string = STRUCTURING_PROMPT_VERSION,
): string {
  const template = TEMPLATES[version]
  if (!template) {
    throw new Error(`Unknown structuring prompt version: ${version}`)
  }
  return template
}
