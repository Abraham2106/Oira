import { describe, expect, it, vi } from "vitest"
import {
  SYNTHETIC_TRANSCRIPT,
  syntheticClinicalNote,
} from "../../shared/fixtures/synthetic-consult"
import type { NoteVerifierPort } from "../../shared/types/note-verification"
import type { InferenceRuntimePort } from "../inference/port"
import { createQwenVerifier } from "./qwen-verifier"

type CompleteQwenInput = { role: "generator" | "reviewer"; prompt: string; schema?: unknown }

function runtimeWith(response: string): InferenceRuntimePort {
  return {
    warmTranscription: async () => undefined,
    handoffToStructuring: async () => undefined,
    shutdown: async () => undefined,
    completeQwen: vi.fn(
      async (_input: CompleteQwenInput): Promise<string> => response,
    ),
  }
}

function verifierFor(response: string, timeoutMs?: number): NoteVerifierPort {
  return createQwenVerifier(runtimeWith(response), { timeoutMs })
}

describe("createQwenVerifier", () => {
  const input = {
    transcript: SYNTHETIC_TRANSCRIPT,
    note: syntheticClinicalNote(),
  }

  it("entrega observaciones y omisiones tipadas de una revisión completed", async () => {
    const reviewer = verifierFor(
      JSON.stringify({
        status: "completed",
        observations: [
          {
            sectionId: "clinical_narrative",
            claim: "El dolor se describe como de tres días.",
            status: "SUPPORTED",
            severity: "warning",
            problemType: "other",
            evidence: {
              segmentIds: ["seg-2"],
              quotes: ["Dolor de rodilla izquierda desde hace tres días"],
            },
            explanation: "La cita literal aparece en el segmento.",
          },
        ],
        omissions: [
          {
            sectionId: "clinician_documented_assessment",
            missingClaim: "Diagnóstico no establecido",
            expectedFromSource: "No hay diagnóstico de este prototipo.",
          },
        ],
      }),
    )

    const result = await reviewer.verify(input)
    expect(result.status).toBe("completed")
    if (result.status !== "completed") return
    expect(result.observations).toHaveLength(1)
    expect(result.observations[0]).toMatchObject({
      sectionId: "clinical_narrative",
      claim: "El dolor se describe como de tres días.",
      status: "SUPPORTED",
      severity: "warning",
      problemType: "other",
    })
    expect(result.observations[0].evidence.quotes[0]).toContain("tres días")
    expect(result.omissions[0]).toMatchObject({
      sectionId: "clinician_documented_assessment",
      missingClaim: "Diagnóstico no establecido",
    })
  })

  it("declara not_completed si una observación refiere una sección desconocida", async () => {
    const reviewer = verifierFor(
      JSON.stringify({
        status: "completed",
        observations: [
          {
            sectionId: "sección_inventada",
            claim: "X",
            status: "AMBIGUOUS",
            severity: "warning",
            problemType: "other",
            evidence: {
              segmentIds: ["seg-2"],
              quotes: ["Dolor de rodilla izquierda desde hace tres días"],
            },
            explanation: "",
          },
        ],
      }),
    )
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("sección")
  })

  it("declara not_completed si la evidencia no corresponde a un segmento real", async () => {
    const reviewer = verifierFor(
      JSON.stringify({
        status: "completed",
        observations: [
          {
            sectionId: "clinical_narrative",
            claim: "X",
            status: "SUPPORTED",
            severity: "warning",
            problemType: "other",
            evidence: { segmentIds: ["segmento-inexistente"], quotes: ["X"] },
            explanation: "",
          },
        ],
      }),
    )
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("evidencia")
  })

  it("declara not_completed si una omisión no cita texto de la transcripción", async () => {
    const reviewer = verifierFor(
      JSON.stringify({
        status: "completed",
        omissions: [
          {
            sectionId: "relevant_history",
            missingClaim: "Alergias",
            expectedFromSource: "Texto inexistente en la consulta.",
          },
        ],
      }),
    )
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("omisión")
  })

  it("propaga not_completed con su error", async () => {
    const reviewer = verifierFor(
      JSON.stringify({ status: "not_completed", error: "El modelo se detuvo." }),
    )
    const result = await reviewer.verify(input)
    expect(result).toEqual({
      status: "not_completed",
      error: "El modelo se detuvo.",
    })
  })

  it("declara not_completed cuando la salida no es JSON", async () => {
    const reviewer = verifierFor("esto no es json")
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("JSON")
  })

  it("declara not_completed cuando la salida no pasa el esquema", async () => {
    const reviewer = verifierFor(
      JSON.stringify({
        status: "completed",
        observations: [{ claim: "falta el resto de campos obligatorios" }],
      }),
    )
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("inválida")
  })

  it("declara not_completed si el runtime excede el timeout", async () => {
    const never = new Promise<string>(() => undefined)
    const reviewer = createQwenVerifier(
      {
        warmTranscription: async () => undefined,
        handoffToStructuring: async () => undefined,
        shutdown: async () => undefined,
        completeQwen: vi.fn(async () => never),
      },
      { timeoutMs: 10 },
    )
    const result = await reviewer.verify(input)
    expect(result.status).toBe("not_completed")
    if (result.status !== "not_completed") return
    expect(result.error).toContain("timeout")
  })

  it("envía al runtime el rol reviewer y el prompt de auditoría", async () => {
    const completeQwen = vi.fn(
      async (_input: CompleteQwenInput): Promise<string> => "",
    )
    const reviewer = createQwenVerifier({
      warmTranscription: async () => undefined,
      handoffToStructuring: async () => undefined,
      shutdown: async () => undefined,
      completeQwen,
    })
    await reviewer.verify(input)
    expect(completeQwen).toHaveBeenCalledTimes(1)
    const call = completeQwen.mock.calls[0]?.[0]
    expect(call.role).toBe("reviewer")
    expect(call.prompt).toContain("auditor clínico")
    expect(call.prompt).toContain("No reescribas, no completes, no aceptes la nota.")
    expect(call.prompt).toContain("[seg-2]")
  })
})
