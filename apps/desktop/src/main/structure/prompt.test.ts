import { describe, expect, it } from "vitest"
import type { TranscriptSegment } from "@oira/types"
import { buildStructuringMessages } from "./prompt"

function segment(id: string, text: string): TranscriptSegment {
  return { id, speaker: "Médico", startMs: 0, text }
}

describe("main/structure/prompt", () => {
  it("incluye las reglas inviolables y las 7 secciones en el system prompt", () => {
    const { system } = buildStructuringMessages([segment("seg-1", "hola")])

    expect(system).toContain("el médico decide")
    expect(system).toContain("STATED")
    expect(system).toContain("NOT_STATED")
    expect(system).toContain("sourceSegmentIds")
    expect(system).toContain("follow_up")
    expect(system).toContain("clinician_documented_plan")
  })

  it("formatea los segmentos con id y hablante", () => {
    const transcript: TranscriptSegment[] = [
      { id: "seg-1", speaker: "Médico", startMs: 0, text: "¿Qué le trae hoy?" },
      { id: "seg-2", speaker: "Paciente", startMs: 4_000, text: "Me duele la rodilla." },
    ]
    const { user } = buildStructuringMessages(transcript)

    expect(user).toContain("[seg-1 | Médico] ¿Qué le trae hoy?")
    expect(user).toContain("[seg-2 | Paciente] Me duele la rodilla.")
  })

  it("avisa cuando recorta por longitud", () => {
    const transcript = Array.from({ length: 401 }, (_, index) =>
      segment(`seg-${index}`, `línea ${index}`),
    )
    const { user } = buildStructuringMessages(transcript)

    expect(user).toContain("1 segmentos omitidos por longitud")
    expect(user).not.toContain("línea 400")
  })
})
