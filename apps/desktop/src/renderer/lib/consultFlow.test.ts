import { describe, expect, it } from "vitest"
import { syntheticNote, SYNTHETIC_TRANSCRIPT } from "../bridge/mock"
import {
  filterTranscript,
  flowStepFromState,
  quotesForSources,
  unreviewedSectionCount,
} from "./consultFlow"

describe("consultFlow", () => {
  it("mapea estados de producto a pasos de la barra", () => {
    expect(flowStepFromState("IDLE")).toBe("consult")
    expect(flowStepFromState("RECORDING")).toBe("record")
    expect(flowStepFromState("TRANSCRIBING")).toBe("process")
    expect(flowStepFromState("READY_FOR_REVIEW")).toBe("review")
    expect(flowStepFromState("EXPORTED")).toBe("export")
  })

  it("filtra el transcript como texto plano", () => {
    const poisoned = [
      ...SYNTHETIC_TRANSCRIPT,
      {
        id: "seg-x",
        speaker: "Paciente" as const,
        startMs: 20000,
        text: "<script>alert(1)</script> dolor sintético",
      },
    ]
    const hits = filterTranscript(poisoned, "<script>")
    expect(hits).toHaveLength(1)
    expect(hits[0]?.text).toContain("<script>")
    expect(filterTranscript(poisoned, "rodilla")).toHaveLength(1)
    expect(
      filterTranscript(
        [{ id: "seg-s", startMs: 0, text: "sin hablante" }],
        "hablante",
      ),
    ).toHaveLength(1)
  })

  it("cuenta secciones sin revisar y cita origen literal", () => {
    const note = syntheticNote()
    expect(unreviewedSectionCount(note)).toBe(7)
    note.sections.visit_context.reviewed = true
    expect(unreviewedSectionCount(note)).toBe(6)
    const quotes = quotesForSources(SYNTHETIC_TRANSCRIPT, ["seg-2", "missing"])
    expect(quotes[0]).toEqual({
      id: "seg-2",
      found: true,
      quote: SYNTHETIC_TRANSCRIPT[1]?.text,
    })
    expect(quotes[1]?.found).toBe(false)
  })
})
