import type { StructuringPort } from "../notes/structuring.port"
import type { QvacClient } from "./qvac.client"

/**
 * Returns raw text on purpose. Zod validation stays in notes/.
 * Does not write prompts; the caller supplies the template.
 */
export function createStructuringAdapter(client: QvacClient): StructuringPort {
  return {
    async complete({ prompt, transcriptText }) {
      const modelId = await client.ensureModel("structuring")
      return client.runtime().completion({
        modelId,
        prompt,
        transcript: transcriptText,
      })
    },
  }
}
