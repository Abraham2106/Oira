import { describe, expect, it } from "vitest"

import { formatNoteAsText, toPlainText } from "../../../shared/clinical-export"
import { syntheticClinicalNote } from "../../../shared/fixtures/synthetic-consult"

describe("export preview", () => {
  it("keeps clinical text when stripping section titles", () => {
    const preview = formatNoteAsText(syntheticClinicalNote())
    const plain = toPlainText(preview)
    expect(plain).toContain("Consulta ambulatoria de demostración")
    expect(plain).not.toContain("Motivo y contexto de la consulta")
  })
})
