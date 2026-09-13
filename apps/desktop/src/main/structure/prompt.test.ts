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
    expect(system).toContain("No infieras")
    expect(system).toContain("/no_think")
    expect(system).not.toContain("cada una un string")
    expect(system).not.toContain("scan con rayos X")
    expect(system).not.toContain("vaya a urgencias")
    expect(user).toContain("sections")
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

  it("keeps the complete transcript for chunking", () => {
    const transcript = Array.from({ length: 401 }, (_, index) =>
      segment(`seg-${index}`, `línea ${index}`),
    )
    const { user } = buildStructuringMessages(transcript)

    expect(user).toContain("línea 400")
  })
})
