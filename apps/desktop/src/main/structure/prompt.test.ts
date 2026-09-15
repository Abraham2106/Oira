import { describe, expect, it } from "vitest"
import type { TranscriptSegment } from "@oira/types"
import { buildStructuringMessages } from "./prompt"

function segment(id: string, text: string): TranscriptSegment {
  return { id, speaker: "Médico", startMs: 0, text }
}

describe("main/structure/prompt", () => {
  it("pide JSON I4 con presence y sourceSegmentIds", () => {
    const { system, user } = buildStructuringMessages([segment("seg-1", "hola")])

    expect(system).toContain("el médico decide")
    expect(system).toContain("sections")
    expect(system).toContain("presence")
    expect(system).toContain("sourceSegmentIds")
    expect(system).toContain("STATED")
    expect(system).toContain("NOT_STATED")
    expect(system).toContain("UNKNOWN")
    expect(system).toContain("visit_context")
    expect(system).toContain("clinical_narrative")
    expect(system).toContain("follow_up")
    expect(system).toContain("clinician_documented_plan")
    expect(system).toContain("No inventes")
    expect(system).toContain("/no_think")
    expect(system).not.toContain("cada una un string")
    expect(system).not.toContain("scan con rayos X")
    expect(system).not.toContain("vaya a urgencias")
    expect(system).not.toContain('"s2"')
    expect(system).not.toContain('"s5"')
    expect(system).not.toContain('"s3"')
    expect(system).not.toContain('"s7"')
    expect(user).toContain("sections")
    expect(user).toContain('IDs válidos en esta solicitud: ["seg-1"]')
  })

  it("pide estilo clínico impersonal y las diez reglas de documentación", () => {
    const { system, user } = buildStructuringMessages([segment("seg-1", "hola")])

    expect(system).toContain("tercera persona")
    expect(system).toContain("No copies las preguntas de la entrevista")
    expect(system).toContain("Evita la primera persona")
    expect(system).toContain("tengo tos")
    expect(system).toContain("refiere/niega/menciona")
    expect(system).toContain("el profesional documenta")
    expect(system).toContain("se indica")
    expect(system).toContain("No conviertas un síntoma referido en un hallazgo observado")
    expect(system).toContain("No cambies ni completes medicamentos")
    expect(system).toContain("No sustituyas un medicamento por otro")
    expect(system).toContain("Si Whisper parece haber errado, no adivines")
    expect(system).toContain("No inventes diagnósticos")
    expect(system).toContain('presence="NOT_STATED"')
    expect(system).toContain('text=""')
    expect(system).toContain("sourceSegmentIds=[]")
    expect(system).toContain("No escribas \"No reportado\"")
    expect(system).toContain("Devuelve exclusivamente el JSON")
    expect(system).toContain("Sin encabezados ni texto extra")
    expect(system).toContain("visit_context")
    expect(system).toContain("clinical_narrative")
    expect(system).toContain("relevant_history")
    expect(system).toContain("reported_findings")
    expect(system).toContain("clinician_documented_assessment")
    expect(system).toContain("clinician_documented_plan")
    expect(system).toContain("follow_up")
    expect(user).toContain("Responde solo con el JSON")
  })

  it("formatea los segmentos con id y hablante", () => {
    const transcript: TranscriptSegment[] = [
      { id: "seg-1", speaker: "Médico", startMs: 0, text: "¿Qué le trae hoy?" },
      { id: "seg-2", speaker: "Paciente", startMs: 4_000, text: "Me duele la rodilla." },
    ]
    const { user } = buildStructuringMessages(transcript)

    expect(user).toContain("[seg-1 | Médico] ¿Qué le trae hoy?")
    expect(user).toContain("[seg-2 | Paciente] Me duele la rodilla.")
    expect(user).toContain('IDs válidos en esta solicitud: ["seg-1","seg-2"]')
  })

  it("pasa los ids reales del chunk, incluidos ids numéricos de Whisper", () => {
    const transcript: TranscriptSegment[] = [
      { id: "0", speaker: null, startMs: 0, text: "Consulta por dolor de garganta." },
      { id: "1", speaker: null, startMs: 2_000, text: "Tos seca." },
    ]
    const { system, user } = buildStructuringMessages(transcript)

    expect(user).toContain("[0 | sin rol identificado] Consulta por dolor de garganta.")
    expect(user).toContain('IDs válidos en esta solicitud: ["0","1"]')
    expect(system).not.toMatch(/"s\d+"/)
  })

  it("keeps the complete transcript for chunking", () => {
    const transcript = Array.from({ length: 401 }, (_, index) =>
      segment(`seg-${index}`, `línea ${index}`),
    )
    const { user } = buildStructuringMessages(transcript)

    expect(user).toContain("línea 400")
  })
})
