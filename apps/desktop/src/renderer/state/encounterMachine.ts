import type { ProductState } from "@oira/types"

export type MachineEvent =
  | "START"
  | "STOP"
  | "TRANSCRIBE_DONE"
  | "STRUCTURE_DONE"
  | "EDIT"
  | "ACCEPT"
  | "EXPORT"
  | "FAIL"
  | "RESET"

export type MachineSnapshot = {
  state: ProductState
  previousState: ProductState | null
}

const TRANSITIONS: Record<ProductState, Partial<Record<MachineEvent, ProductState>>> = {
  IDLE: { START: "RECORDING", FAIL: "ERROR" },
  RECORDING: { STOP: "TRANSCRIBING", FAIL: "ERROR", RESET: "IDLE" },
  TRANSCRIBING: { TRANSCRIBE_DONE: "STRUCTURING", FAIL: "ERROR" },
  STRUCTURING: { STRUCTURE_DONE: "READY_FOR_REVIEW", FAIL: "ERROR" },
  READY_FOR_REVIEW: { EDIT: "EDITING", ACCEPT: "ACCEPTED", FAIL: "ERROR" },
  EDITING: { EDIT: "EDITING", ACCEPT: "ACCEPTED", FAIL: "ERROR" },
  ACCEPTED: { EXPORT: "EXPORTED", EDIT: "EDITING", FAIL: "ERROR" },
  EXPORTED: { RESET: "IDLE" },
  ERROR: { RESET: "IDLE" },
}

export function createMachine(state: ProductState = "IDLE"): MachineSnapshot {
  return { state, previousState: null }
}

export function canTransition(from: ProductState, event: MachineEvent): boolean {
  return TRANSITIONS[from][event] !== undefined
}

export function reduceMachine(current: MachineSnapshot, event: MachineEvent): MachineSnapshot {
  const next = TRANSITIONS[current.state][event]
  if (!next) {
    throw new Error(`Transición inválida: ${current.state} + ${event}`)
  }
  return {
    state: next,
    previousState: current.state,
  }
}

export function isRecordingIndicatorOn(state: ProductState): boolean {
  return state === "RECORDING"
}
