const STATE_LABELS: Record<string, string> = {
  IDLE: "Sin actividad",
  RECORDING: "Grabando",
  TRANSCRIBING: "Transcribiendo",
  STRUCTURING: "Estructurando",
  READY_FOR_REVIEW: "Lista para revisión",
  EDITING: "Editando borrador",
  ACCEPTED: "Aceptada por el médico",
  EXPORTED: "Exportada",
  ERROR: "Con error",
}

export function stateLabel(state: string): string {
  // Never leak a raw state code into the UI (privacy copy convention).
  return STATE_LABELS[state] ?? "Sin determinar"
}
