import {
  SECTION_IDS,
  SECTION_TITLES,
  type ClinicalNote,
  type FieldPresence,
  type FieldProvenance,
  type FieldValue,
  type SectionId,
} from "@oira/types"

export const NOT_STATED_BODY = "No consta en la consulta."
export const UNKNOWN_BODY = "Sin determinar."
export const UNIDENTIFIED_AUTHORSHIP = "Autoría no identificada en esta versión."
export const PRINT_DISCLAIMER =
  "Esta exportación no es un documento legal firmado."

export const SOAP_GROUPS = [
  {
    id: "S",
    title: "S — Subjetivo",
    sectionIds: ["visit_context", "clinical_narrative", "relevant_history"],
  },
  {
    id: "O",
    title: "O — Objetivo",
    sectionIds: ["reported_findings"],
  },
  {
    id: "A",
    title: "A — Evaluación",
    sectionIds: ["clinician_documented_assessment"],
  },
  {
    id: "P",
    title: "P — Plan",
    sectionIds: ["clinician_documented_plan", "follow_up"],
  },
] as const

export type ExportFileFormat = "txt" | "json" | "pdf" | "fhir"
export type ExportPresentation = "sections" | "soap"
export type ExportPreviewFormat = "sections" | "plain" | "soap"

export type ExportableNoteRecord = {
  id: string
  encounterId: string
  acceptedAt: string
  label: string
  visitType: string
  note: ClinicalNote
}

export type ExportAuthorship = {
  exportedBy: { displayName: string; email: string } | null
}

export type ProjectedSection = {
  id: SectionId
  title: string
  /** Visible body used by TXT, PDF and FHIR narrative. */
  body: string
  presence: FieldPresence
  provenance: FieldProvenance
  sourceSegmentIds: readonly string[]
  /** Literal field text from the accepted note (may be empty). */
  text: string
}

export type DocumentProjection = {
  noteId: string
  encounterId: string
  acceptedAt: string
  label: string
  visitType: string
  authorshipLine: string
  sections: ProjectedSection[]
}

export type SoapGroupView = {
  id: (typeof SOAP_GROUPS)[number]["id"]
  title: string
  sections: ProjectedSection[]
}

export type PrintBlock = {
  kind: "group" | "section"
  title: string
  body?: string
}

export type PrintFillPayload = {
  disclaimer: string
  noteId: string
  encounterId: string
  acceptedAt: string
  label: string
  visitType: string
  authorshipLine: string
  blocks: PrintBlock[]
}

export function sectionBody(field: FieldValue): string {
  if (field.presence === "NOT_STATED") return NOT_STATED_BODY
  if (field.presence === "UNKNOWN") return UNKNOWN_BODY
  return field.text
}

export function formatNoteAsText(note: ClinicalNote): string {
  return SECTION_IDS.map((id) => `${SECTION_TITLES[id]}\n${sectionBody(note.sections[id])}`).join(
    "\n\n",
  )
}

export function formatNoteAsJson(
  note: ClinicalNote,
  extra: object = {},
): string {
  return `${JSON.stringify({ ...extra, note }, null, 2)}\n`
}

export function authorshipLine(authorship?: ExportAuthorship): string {
  const profile = authorship?.exportedBy
  if (!profile) return UNIDENTIFIED_AUTHORSHIP
  return `Exportado por ${profile.displayName} (${profile.email})`
}

export function toDocumentProjection(
  record: ExportableNoteRecord,
  authorship?: ExportAuthorship,
): DocumentProjection {
  return {
    noteId: record.id,
    encounterId: record.encounterId,
    acceptedAt: record.acceptedAt,
    label: record.label,
    visitType: record.visitType,
    authorshipLine: authorshipLine(authorship),
    sections: SECTION_IDS.map((id) => {
      const field = record.note.sections[id]
      return {
        id,
        title: SECTION_TITLES[id],
        body: sectionBody(field),
        presence: field.presence,
        provenance: field.provenance,
        sourceSegmentIds: [...field.sourceSegmentIds],
        text: field.text,
      }
    }),
  }
}

export function toSoapPresentation(note: ClinicalNote): SoapGroupView[] {
  const projection = toDocumentProjection({
    id: "preview",
    encounterId: "preview",
    acceptedAt: "",
    label: "",
    visitType: "",
    note,
  })
  return soapGroupsFromProjection(projection)
}

export function soapGroupsFromProjection(projection: DocumentProjection): SoapGroupView[] {
  const byId = new Map(projection.sections.map((section) => [section.id, section]))
  return SOAP_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    sections: group.sectionIds.map((id) => {
      const section = byId.get(id)
      if (!section) {
        throw new Error(`SOAP grouping is missing section ${id}.`)
      }
      return section
    }),
  }))
}

export function formatSoapAsText(note: ClinicalNote): string {
  return soapGroupsFromProjection(
    toDocumentProjection({
      id: "preview",
      encounterId: "preview",
      acceptedAt: "",
      label: "",
      visitType: "",
      note,
    }),
  )
    .map((group) => {
      const sections = group.sections
        .map((section) => `${section.title}\n${section.body}`)
        .join("\n\n")
      return `${group.title}\n\n${sections}`
    })
    .join("\n\n")
}

const TITLE_LINES: ReadonlySet<string> = new Set(Object.values(SECTION_TITLES))

export function toPlainText(preview: string): string {
  const withoutTitles = preview.split("\n").filter((line) => !TITLE_LINES.has(line))
  return withoutTitles.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

export function formatExportPreview(
  note: ClinicalNote,
  format: ExportPreviewFormat,
): string {
  if (format === "plain") return toPlainText(formatNoteAsText(note))
  if (format === "soap") return formatSoapAsText(note)
  return formatNoteAsText(note)
}

export function pdfPresentationForPreview(
  format: ExportPreviewFormat,
): ExportPresentation {
  return format === "soap" ? "soap" : "sections"
}

export function toPrintFillPayload(
  projection: DocumentProjection,
  presentation: ExportPresentation,
): PrintFillPayload {
  const blocks: PrintBlock[] =
    presentation === "soap"
      ? soapGroupsFromProjection(projection).flatMap((group) => [
          { kind: "group" as const, title: group.title },
          ...group.sections.map((section) => ({
            kind: "section" as const,
            title: section.title,
            body: section.body,
          })),
        ])
      : projection.sections.map((section) => ({
          kind: "section" as const,
          title: section.title,
          body: section.body,
        }))

  return {
    disclaimer: PRINT_DISCLAIMER,
    noteId: projection.noteId,
    encounterId: projection.encounterId,
    acceptedAt: projection.acceptedAt,
    label: projection.label.trim() ? projection.label : "—",
    visitType: projection.visitType.trim() ? projection.visitType : "—",
    authorshipLine: projection.authorshipLine,
    blocks,
  }
}

export function formatPrintDocumentText(payload: PrintFillPayload): string {
  const meta = [
    "Oira",
    payload.disclaimer,
    `Nota: ${payload.noteId}`,
    `Consulta: ${payload.encounterId}`,
    `Aceptada: ${payload.acceptedAt}`,
    `Etiqueta: ${payload.label}`,
    `Tipo: ${payload.visitType}`,
    payload.authorshipLine,
  ].join("\n")
  const body = payload.blocks
    .map((block) =>
      block.kind === "group" ? block.title : `${block.title}\n${block.body ?? ""}`,
    )
    .join("\n\n")
  return `${meta}\n\n${body}\n`
}
