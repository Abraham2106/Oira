import type { StructuringOutput } from "../schema"
import type { GenerationIssue } from "../generation-errors"
import { SECTION_IDS } from "@oira/types"

/**
 * EV-SCHEMA-* — reglas de estructura pura del borrador.
 *
 * La salida siempre tiene las 7 secciones (es el contrato de schema).
 * Esta función detecta formas internamente inconsistentes:
 *  - STATED con texto vacío (debería ser NOT_STATED).
 */
export function validateSchemaRules(output: StructuringOutput): GenerationIssue[] {
  return SECTION_IDS.reduce((issues, id) => {
    const section = output.sections[id]
    if (!section) {
      issues.push({
        code: "MISSING_SECTION",
        sectionId: id,
        message: `Falta la sección ${id} en la salida.`,
      })
    } else if (section.presence === "STATED" && !section.text.trim()) {
      issues.push({
        code: "STATED_WITHOUT_TEXT",
        sectionId: id,
        message: `La sección ${id} es STATED pero su text está vacío.`,
      })
    }
    return issues
  }, [] as GenerationIssue[])
}
