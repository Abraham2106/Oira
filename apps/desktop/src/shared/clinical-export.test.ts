import { describe, expect, it } from "vitest"

import {
  SENTINEL_DOSE,
  SENTINEL_NEGATION,
  SENTINEL_TEMPERATURE,
  sentinelClinicalNote,
} from "./fixtures/sentinel-consult"
import { syntheticClinicalNote } from "./fixtures/synthetic-consult"
import {
  UNIDENTIFIED_AUTHORSHIP,
  formatExportPreview,
  formatNoteAsJson,
  formatNoteAsText,
  formatPrintDocumentText,
  formatSoapAsText,
  toDocumentProjection,
  toPrintFillPayload,
  toSoapPresentation,
} from "./clinical-export"

describe("clinical export formatters", () => {
  it("formats every section and uses the Spanish absence labels", () => {
    const text = formatNoteAsText(syntheticClinicalNote())

    expect(text).toContain(
      "Antecedentes relevantes\nNo consta en la consulta.",
    )
    expect(text).toContain("Hallazgos comunicados\nSin determinar.")
    expect(text.split("\n\n")).toHaveLength(7)
  })

  it("formats stable, pretty JSON with optional export metadata", () => {
    const note = syntheticClinicalNote()
    const first = formatNoteAsJson(note, {
      encounterId: "00000000-0000-4000-8000-000000000001",
    })
    const second = formatNoteAsJson(note, {
      encounterId: "00000000-0000-4000-8000-000000000001",
    })

    expect(first).toBe(second)
    expect(first.endsWith("\n")).toBe(true)
    expect(JSON.parse(first)).toEqual({
      encounterId: "00000000-0000-4000-8000-000000000001",
      note,
    })
  })
})

describe("document projection and SOAP view", () => {
  const record = {
    id: "00000000-0000-4000-8000-000000000002",
    encounterId: "00000000-0000-4000-8000-000000000001",
    acceptedAt: "2026-09-15T12:00:00.000Z",
    label: "Centinela",
    visitType: "Control",
    note: sentinelClinicalNote(),
  }

  it("keeps sentinel text, dose, negation and UNKNOWN labels", () => {
    const projection = toDocumentProjection(record)
    const text = formatNoteAsText(record.note)
    expect(text).toContain(SENTINEL_TEMPERATURE)
    expect(text).toContain(SENTINEL_DOSE)
    expect(text).toContain(SENTINEL_NEGATION)
    expect(projection.sections.find((section) => section.id === "reported_findings")?.body).toBe(
      "Sin determinar.",
    )
    expect(projection.sections.find((section) => section.id === "relevant_history")?.body).toBe(
      "No consta en la consulta.",
    )
    expect(projection.authorshipLine).toBe(UNIDENTIFIED_AUTHORSHIP)
    expect(projection.sections[0]?.sourceSegmentIds).toEqual(["seg-temp"])
  })

  it("groups SOAP without rewriting section bodies", () => {
    const soap = toSoapPresentation(record.note)
    expect(soap.map((group) => group.id)).toEqual(["S", "O", "A", "P"])
    const soapText = formatSoapAsText(record.note)
    expect(soapText).toContain("S — Subjetivo")
    expect(soapText).toContain(`Motivo y contexto de la consulta\nConsulta de control. Temperatura axilar ${SENTINEL_TEMPERATURE}.`)
    expect(soapText).toContain(SENTINEL_NEGATION)
    expect(soapText).toContain(SENTINEL_DOSE)
    expect(soapText).toContain("Sin determinar.")
    for (const group of soap) {
      for (const section of group.sections) {
        expect(section.body).toBe(
          record.note.sections[section.id].presence === "STATED"
            ? record.note.sections[section.id].text
            : section.body,
        )
      }
    }
  })

  it("serializes the print document with the same clinical strings", () => {
    const payload = toPrintFillPayload(toDocumentProjection(record), "sections")
    const printed = formatPrintDocumentText(payload)
    expect(printed).toContain(SENTINEL_TEMPERATURE)
    expect(printed).toContain(SENTINEL_DOSE)
    expect(printed).toContain(SENTINEL_NEGATION)
    expect(printed).toContain("Esta exportación no es un documento legal firmado.")
    expect(formatExportPreview(record.note, "soap")).toContain("S — Subjetivo")
  })
})
