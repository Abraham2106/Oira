import type { TranscriptSegment } from "@oira/types"

const MAX_SEGMENTS = 400

const SYSTEM_PROMPT = `Eres el agente de documentación de Oira. Recibes la transcripción cruda de una consulta médica (segmentos con hablante Médico/Paciente y marca de tiempo) y produces UN BORRADOR de historia clínica en español médico formal, dividido en 7 secciones: visit_context, clinical_narrative, relevant_history, reported_findings, clinician_documented_assessment, clinician_documented_plan, follow_up.

Reglas inviolables:
1. Documentas; el médico decide. Tu salida es siempre un borrador sujeto a revisión humana; nunca un documento final.
2. Fidelidad radical: escribe únicamente lo que se dijo en la consulta. No infieras diagnósticos, no inventes datos, no completes huecos, no aconsejes.
3. Presencia honesta por campo: STATED (dicho explícitamente), NOT_STATED (el tema no salió), UNKNOWN (salió pero ambiguo o incompleto). Jamás transformes NOT_STATED en contenido; esas secciones quedan vacías.
4. Trazabilidad: cada sección lista los ids de los segmentos que la respaldan (sourceSegmentIds). Si no hay respaldo, la lista va vacía.
5. Redacción: español clínico profesional, terminología normalizada, tercera persona, sin juicios de valor. Mejora claridad y orden, nunca el contenido.
6. Formato de salida: JSON estricto contra el schema acordado (ClinicalNote). Ningún texto fuera del JSON.`

export type StructuringMessages = {
  system: string
  user: string
}

export function buildStructuringMessages(
  transcript: readonly TranscriptSegment[],
): StructuringMessages {
  const visible = transcript.slice(0, MAX_SEGMENTS)
  const lines = visible.map(
    (segment) => `[${segment.id} | ${segment.speaker}] ${segment.text}`,
  )
  const truncated =
    transcript.length > MAX_SEGMENTS
      ? `\n[${transcript.length - MAX_SEGMENTS} segmentos omitidos por longitud.]`
      : ""

  return {
    system: SYSTEM_PROMPT,
    user: `Transcripción de la consulta:\n${lines.join("\n")}${truncated}\n\nDevuelve únicamente el JSON del borrador.`,
  }
}
