import { z } from "zod"
import type { NoteVerifierPort, NoteVerificationInput, NoteVerificationResult, NoteClaimObservation, NoteOmission } from "../../shared/types/note-verification"
import type { InferenceRuntimePort } from "../inference/port"
import { buildReviewPrompt, REVIEW_PROMPT_VERSION } from "../structure/review-prompt"
import { SECTION_IDS, type SectionId } from "@oira/types"

/** Zod schema para validar la salida del revisor. */
const ReviewObservationSchema = z.object({
  sectionId: z.string(),
  claim: z.string(),
  status: z.enum(["SUPPORTED", "CONTRADICTED", "INSUFFICIENT_EVIDENCE", "AMBIGUOUS"]),
  severity: z.enum(["blocking", "warning"]),
  problemType: z.enum(["invention", "contradiction", "negation", "dose", "unit", "subject", "temporal", "uncertainty", "omission", "other"]),
  evidence: z.object({
    segmentIds: z.array(z.string()),
    quotes: z.array(z.string()),
  }),
  explanation: z.string(),
})

const ReviewOmissionSchema = z.object({
  sectionId: z.string(),
  missingClaim: z.string(),
  expectedFromSource: z.string(),
})

const ReviewOutputSchema = z.object({
  status: z.enum(["completed", "not_completed"]),
  observations: z.array(ReviewObservationSchema).optional(),
  omissions: z.array(ReviewOmissionSchema).optional(),
  error: z.string().optional(),
})

export type ReviewerConfig = {
  /** Modelo a usar como revisor. Si no se especifica, usa el mismo que el generador. */
  reviewerModelId?: string
  /** Timeout en ms para la respuesta del revisor. */
  timeoutMs?: number
}

function isSectionId(id: string): id is SectionId {
  return (SECTION_IDS as readonly string[]).includes(id)
}

function hasLiteralEvidence(
  segmentTexts: Map<string, string>,
  segmentIds: string[],
  quotes: string[],
): boolean {
  return segmentIds.length > 0 && quotes.length > 0 &&
    segmentIds.every((id) => segmentTexts.has(id)) &&
    quotes.every((quote) => {
      const literal = quote.trim()
      return literal.length > 0 && segmentIds.some((id) => segmentTexts.get(id)?.includes(literal))
    })
}

export function createQwenVerifier(
  runtime: InferenceRuntimePort,
  config: ReviewerConfig = {},
): NoteVerifierPort {
  const timeoutMs = config.timeoutMs ?? 60000

  return {
    async verify(input: NoteVerificationInput): Promise<NoteVerificationResult> {
      const prompt = buildReviewPrompt(
        input.transcript.map((s) => ({ id: s.id, text: s.text })),
        input.note.sections as Record<string, { presence: string; text: string; sourceSegmentIds: string[] }>,
      )

      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        const response = await Promise.race([
          runtime.completeQwen({
            role: "reviewer",
            prompt,
            schema: undefined, // El revisor valida contra ReviewOutputSchema internamente
          }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Reviewer timeout")), timeoutMs)
          }),
        ])

        // Parsear y validar la salida del revisor
        let parsed: unknown
        try {
          parsed = JSON.parse(response)
        } catch {
          return { status: "not_completed", error: "La salida del revisor no es JSON válido." }
        }

        const validated = ReviewOutputSchema.safeParse(parsed)
        if (!validated.success) {
          return { status: "not_completed", error: `Salida del revisor inválida: ${validated.error.message}` }
        }

        if (validated.data.status === "not_completed") {
          return { status: "not_completed", error: validated.data.error ?? "Revisión no completada." }
        }

        const segmentTexts = new Map(input.transcript.map((segment) => [segment.id, segment.text]))
        const invalidObservation = (validated.data.observations ?? []).find((observation) =>
          !isSectionId(observation.sectionId) ||
          !hasLiteralEvidence(segmentTexts, observation.evidence.segmentIds, observation.evidence.quotes),
        )
        if (invalidObservation) {
          return {
            status: "not_completed",
            error: "La revisión contiene una sección o evidencia no verificable en la transcripción.",
          }
        }

        const invalidOmission = (validated.data.omissions ?? []).find((omission) =>
          !isSectionId(omission.sectionId) ||
          !omission.expectedFromSource.trim() ||
          ![...segmentTexts.values()].some((text) => text.includes(omission.expectedFromSource.trim())),
        )
        if (invalidOmission) {
          return {
            status: "not_completed",
            error: "La revisión contiene una omisión no verificable en la transcripción.",
          }
        }

        // Convertir a tipos del puerto
        const observations: NoteClaimObservation[] = (validated.data.observations ?? []).map((o) => ({
          sectionId: o.sectionId as SectionId,
          claim: o.claim,
          status: o.status,
          severity: o.severity,
          problemType: o.problemType,
          evidence: { segmentIds: o.evidence.segmentIds, quotes: o.evidence.quotes },
          explanation: o.explanation,
        }))

        const omissions: NoteOmission[] = (validated.data.omissions ?? []).map((o) => ({
          sectionId: o.sectionId as SectionId,
          missingClaim: o.missingClaim,
          expectedFromSource: o.expectedFromSource,
        }))

        return { status: "completed", observations, omissions }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido en el revisor."
        return { status: "not_completed", error: message }
      } finally {
        if (timeout) clearTimeout(timeout)
      }
    },
  }
}

/** Versión del prompt de revisión para trazabilidad. */
export { REVIEW_PROMPT_VERSION }
