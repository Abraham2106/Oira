import { SECTION_IDS } from "@oira/types"

import {
  UNIDENTIFIED_AUTHORSHIP,
  type DocumentProjection,
  type ExportAuthorship,
} from "../../../shared/clinical-export"

const PATIENT_URN = "urn:oira:patient:unidentified"
const AMB_CLASS = {
  system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code: "AMB",
  display: "ambulatory",
}

export type FhirResource = {
  resourceType: string
  id?: string
  [key: string]: unknown
}

export type FhirBundleEntry = {
  fullUrl: string
  resource: FhirResource
}

export type FhirDocumentBundle = {
  resourceType: "Bundle"
  type: "document"
  timestamp: string
  entry: FhirBundleEntry[]
}

export type FhirBundlePort = {
  build: (
    projection: DocumentProjection,
    authorship?: ExportAuthorship,
  ) => FhirDocumentBundle
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function xhtmlDiv(body: string): string {
  const paragraphs = body.split("\n").map((line) => `<p>${escapeXml(line) || "&nbsp;"}</p>`)
  return `<div xmlns="http://www.w3.org/1999/xhtml">${paragraphs.join("")}</div>`
}

function walkReferences(value: unknown, found: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walkReferences(item, found)
    return
  }
  if (!value || typeof value !== "object") return
  const record = value as Record<string, unknown>
  if (typeof record.reference === "string") found.push(record.reference)
  for (const nested of Object.values(record)) walkReferences(nested, found)
}

export function collectFhirReferences(bundle: FhirDocumentBundle): string[] {
  const found: string[] = []
  for (const entry of bundle.entry) walkReferences(entry.resource, found)
  return found
}

export function assertFhirDocumentComplete(bundle: FhirDocumentBundle): void {
  if (bundle.resourceType !== "Bundle" || bundle.type !== "document") {
    throw new Error("FHIR export must be a document Bundle.")
  }
  if (bundle.entry.length === 0) {
    throw new Error("FHIR document Bundle has no entries.")
  }
  const first = bundle.entry[0]?.resource
  if (first?.resourceType !== "Composition") {
    throw new Error("The first FHIR document entry must be a Composition.")
  }
  if (first.status !== "final") {
    throw new Error("Exported Composition.status must be final after clinician acceptance.")
  }
  const urls = new Set(bundle.entry.map((entry) => entry.fullUrl))
  for (const reference of collectFhirReferences(bundle)) {
    if (!urls.has(reference)) {
      throw new Error(`FHIR document has an unresolved reference: ${reference}`)
    }
  }
  const sections = first.section
  if (!Array.isArray(sections) || sections.length !== SECTION_IDS.length) {
    throw new Error("FHIR Composition must include all seven Oira sections.")
  }
}

export function buildFhirDocumentBundle(
  projection: DocumentProjection,
  authorship?: ExportAuthorship,
  exportedAt = projection.acceptedAt,
): FhirDocumentBundle {
  const compositionUrn = `urn:oira:composition:${projection.noteId}`
  const encounterUrn = `urn:oira:encounter:${projection.encounterId}`
  const provenanceUrn = `urn:oira:provenance:${projection.noteId}`
  const practitionerUrn = authorship?.exportedBy
    ? `urn:oira:practitioner:${encodeURIComponent(authorship.exportedBy.email)}`
    : undefined

  const patient: FhirResource = {
    resourceType: "Patient",
    id: "unidentified",
    name: [{ text: "Sin identificar" }],
  }

  const encounter: FhirResource = {
    resourceType: "Encounter",
    id: projection.encounterId,
    status: "finished",
    class: AMB_CLASS,
    subject: { reference: PATIENT_URN },
  }

  const practitioner: FhirResource | undefined = authorship?.exportedBy
    ? {
        resourceType: "Practitioner",
        id: "exporter",
        name: [{ text: authorship.exportedBy.displayName }],
        telecom: [{ system: "email", value: authorship.exportedBy.email }],
      }
    : undefined

  const composition: FhirResource = {
    resourceType: "Composition",
    id: projection.noteId,
    status: "final",
    title: "Nota clínica Oira",
    date: projection.acceptedAt,
    type: { text: "Nota clínica ambulatoria" },
    subject: { reference: PATIENT_URN },
    encounter: { reference: encounterUrn },
    author: practitionerUrn
      ? [{ reference: practitionerUrn }]
      : [{ display: UNIDENTIFIED_AUTHORSHIP }],
    section: projection.sections.map((section) => ({
      title: section.title,
      text: {
        status: "generated",
        div: xhtmlDiv(section.body),
      },
    })),
  }

  const provenance: FhirResource = {
    resourceType: "Provenance",
    id: `note-${projection.noteId}`,
    recorded: projection.acceptedAt,
    target: [{ reference: compositionUrn }],
    agent: [
      practitionerUrn
        ? { who: { reference: practitionerUrn } }
        : { who: { display: UNIDENTIFIED_AUTHORSHIP } },
    ],
  }

  const entry: FhirBundleEntry[] = [
    { fullUrl: compositionUrn, resource: composition },
    { fullUrl: PATIENT_URN, resource: patient },
    { fullUrl: encounterUrn, resource: encounter },
    { fullUrl: provenanceUrn, resource: provenance },
  ]
  if (practitioner && practitionerUrn) {
    entry.push({ fullUrl: practitionerUrn, resource: practitioner })
  }

  const bundle: FhirDocumentBundle = {
    resourceType: "Bundle",
    type: "document",
    timestamp: exportedAt,
    entry,
  }
  assertFhirDocumentComplete(bundle)
  return bundle
}

export function createFhirBundlePort(): FhirBundlePort {
  return {
    build(projection, authorship) {
      return buildFhirDocumentBundle(projection, authorship)
    },
  }
}
