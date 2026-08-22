import { describe, expect, it } from "vitest"
import {
  canTransition,
  createMachine,
  isRecordingIndicatorOn,
  reduceMachine,
} from "./encounterMachine"

describe("encounterMachine", () => {
  it("recorre IDLE → EXPORTED por el camino válido", () => {
    let machine = createMachine()
    const events = [
      "START",
      "STOP",
      "TRANSCRIBE_DONE",
      "STRUCTURE_DONE",
      "ACCEPT",
      "EXPORT",
    ] as const

    for (const event of events) {
      machine = reduceMachine(machine, event)
    }

    expect(machine.state).toBe("EXPORTED")
  })

  it("no permite ACCEPTED sin READY_FOR_REVIEW", () => {
    expect(canTransition("IDLE", "ACCEPT")).toBe(false)
    expect(canTransition("RECORDING", "ACCEPT")).toBe(false)
    expect(canTransition("TRANSCRIBING", "ACCEPT")).toBe(false)
    expect(() => reduceMachine(createMachine("IDLE"), "ACCEPT")).toThrow()
  })

  it("enciende el indicador de grabación solo en RECORDING", () => {
    expect(isRecordingIndicatorOn("RECORDING")).toBe(true)
    expect(isRecordingIndicatorOn("IDLE")).toBe(false)
    expect(isRecordingIndicatorOn("TRANSCRIBING")).toBe(false)
    expect(isRecordingIndicatorOn("READY_FOR_REVIEW")).toBe(false)
  })
})
