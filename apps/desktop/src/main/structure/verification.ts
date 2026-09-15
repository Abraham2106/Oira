import type { SectionId, TranscriptSegment } from "@oira/types"
import type { GenerationIssue, GenerationIssueCode } from "./generation-errors"
import type { StructuringOutput } from "./schema"
import { validateSchemaRules } from "./rules/schema-rules"
import { checkCitationsInSegment, collectEvidenceIssues } from "./rules/evidence-rules"
import { verifyMeasurementCitation, verifyUnitConsistency } from "./rules/numbers-units-rules"
import { detectNegationFlip, detectNegationScopeShift, detectInventedNegation } from "./rules/negation-rules"
import { detectSubjectShift, detectTenseShift } from "./rules/subject-time-rules"
import { detectCertaintyEscalation, detectInventedCertainty } from "./rules/uncertainty-rules"
import { detectCriticalOmission } from "./rules/omission-rules"
import { detectDuplicateSections, detectSelfContradiction } from "./rules/chunk-correction-rules"

export type VerificationSeverity = "blocking" | "warning"

export type VerificationIssue = GenerationIssue & { severity: VerificationSeverity }

export function runHeuristicVerification(
  output: StructuringOutput,
  transcript: readonly TranscriptSegment[],
): { issues: VerificationIssue[]; blocking: VerificationIssue[]; warnings: VerificationIssue[] } {
  const schemaIssues = validateSchemaRules(output)
  const evidenceIssues = collectEvidenceIssues(output, transcript)
  const citationIssues = checkCitationsInSegment(output, transcript)

  // Reglas semánticas (EV-NEG-*, EV-NUM-*, EV-SUBJ-*, EV-UNC-*, EV-OMIS-*, EV-CHUNK-*)
  const semanticIssues: GenerationIssue[] = []
  for (const id of Object.keys(output.sections) as SectionId[]) {
    const section = output.sections[id]
    if (!section || section.presence !== "STATED") continue
    const text = section.text

    // Buscar segmentos que sirven de fuente para esta sección
    const sourceTexts = section.sourceSegmentIds
      .map((sid) => transcript.find((s) => s.id === sid)?.text)
      .filter((t): t is string => Boolean(t))
    const sourceText = sourceTexts.join(" ")

    semanticIssues.push(
      ...(detectNegationFlip(text, sourceText, id) ? [detectNegationFlip(text, sourceText, id)!] : []),
      ...(detectNegationScopeShift(text, sourceText, id) ? [detectNegationScopeShift(text, sourceText, id)!] : []),
      ...(detectInventedNegation(text, sourceText, id) ? [detectInventedNegation(text, sourceText, id)!] : []),
      ...(detectSubjectShift(text, sourceText, id) ? [detectSubjectShift(text, sourceText, id)!] : []),
      ...(detectTenseShift(text, sourceText, id) ? [detectTenseShift(text, sourceText, id)!] : []),
      ...(detectCertaintyEscalation(text, sourceText, id) ? [detectCertaintyEscalation(text, sourceText, id)!] : []),
      ...(detectInventedCertainty(text, sourceText, id) ? [detectInventedCertainty(text, sourceText, id)!] : []),
      ...(verifyMeasurementCitation(id, text, sourceText) ? [verifyMeasurementCitation(id, text, sourceText)!] : []),
      ...(detectCriticalOmission(text, sourceText, id) ? [detectCriticalOmission(text, sourceText, id)!] : []),
      ...verifyUnitConsistency(text, sourceText, id),
    )
  }

  // Reglas por el borrador completo
  semanticIssues.push(
    ...detectDuplicateSections(
      Object.entries(output.sections).map(([rawId, section]) => ({
        id: rawId as SectionId,
        text: section?.text ?? "",
      })),
    ),
  )
  for (const id of Object.keys(output.sections) as SectionId[]) {
    const section = output.sections[id]
    if (!section || section.presence !== "STATED") continue
    const selfContradiction = detectSelfContradiction(section.text, id)
    if (selfContradiction) semanticIssues.push(selfContradiction)
  }

  const issues: VerificationIssue[] = [
    ...schemaIssues.map((i) => ({ ...i, severity: "blocking" as VerificationSeverity })),
    ...evidenceIssues.map((i) => ({ ...i, severity: "blocking" as VerificationSeverity })),
    ...citationIssues.map((i) => ({ ...i, severity: "warning" as VerificationSeverity })),
    ...semanticIssues.map((i) => ({ ...i, severity: "warning" as VerificationSeverity })),
  ]

  const blocking = issues.filter((i): i is VerificationIssue => i.severity === "blocking")
  const warnings = issues.filter((i): i is VerificationIssue => i.severity === "warning")
  return { issues, blocking, warnings }
}

/** Helper de test para construir un issue con código arbitrario sin romper el type union. */
export function issue(code: GenerationIssueCode, sectionId: SectionId | undefined, message: string): GenerationIssue {
  return { code, sectionId, message }
}
