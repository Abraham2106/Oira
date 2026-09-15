import { describe, expect, it } from "vitest"

import {
  SENTINEL_DOSE,
  SENTINEL_NEGATION,
  SENTINEL_TEMPERATURE,
  sentinelClinicalNote,
} from "../../../shared/fixtures/sentinel-consult"
import { toDocumentProjection } from "../../../shared/clinical-export"
import {
  assertFhirDocumentComplete,
  buildFhirDocumentBundle,
  collectFhirReferences,
} from "./bundle"

const record = {
  id: "00000000-0000-4000-8000-000000000002",
  encounterId: "00000000-0000-4000-8000-000000000001",
  acceptedAt: "2026-09-15T12:00:00.000Z",
  label: "Centinela",
  visitType: "Control",
  note: sentinelClinicalNote(),
}

describe("FHIR document bundle", () => {
  it("emits seven Oira sections with the accepted text", () => {
    const bundle = buildFhirDocumentBundle(toDocumentProjection(record))
    expect(bundle.type).toBe("document")
    expect(bundle.entry[0]?.resource.resourceType).toBe("Composition")
    const composition = bundle.entry[0]?.resource as unknown as {
      status: string
      section: Array<{ title: string; text: { div: string } }>
    }
    expect(composition.status).toBe("final")
    expect(composition.section).toHaveLength(7)
    const narrative = composition.section.map((section) => section.text.div).join("\n")
    expect(narrative).toContain(SENTINEL_TEMPERATURE)
    expect(narrative).toContain(SENTINEL_DOSE)
    expect(narrative).toContain(SENTINEL_NEGATION)
    expect(narrative).toContain("Sin determinar.")
    expect(narrative).toContain("No consta en la consulta.")
    expect(JSON.stringify(bundle)).not.toContain("SNOMED")
    expect(JSON.stringify(bundle)).not.toMatch(/S — Subjetivo/)
  })

  it("rejects orphaned references", () => {
    const bundle = buildFhirDocumentBundle(toDocumentProjection(record))
    bundle.entry.pop()
    bundle.entry[0]!.resource = {
      ...bundle.entry[0]!.resource,
      encounter: { reference: "urn:oira:missing" },
    }
    expect(() => assertFhirDocumentComplete(bundle)).toThrow(/unresolved reference/)
    expect(collectFhirReferences(bundle)).toContain("urn:oira:missing")
  })
})
