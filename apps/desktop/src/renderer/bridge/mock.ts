import {
  SECTION_IDS,
  SECTION_TITLES,
  type ClinicalNote,
  type FieldValue,
  type TranscriptSegment,
} from "@notalocal/types"

/** UI fixture for the renderer prototype — not the Main IPC contract. */
export type DemoBridge = {
  startEncounter: (input: {
    label: string
    visitType: string
  }) => Promise<{ encounterId: string; startedAt: string }>
  stopEncounter: (encounterId: string) => Promise<void>
  generateNote: (encounterId: string) => Promise<{
    transcript: TranscriptSegment[]
    note: ClinicalNote
  }>
  saveNote: (encounterId: string, note: ClinicalNote) => Promise<void>
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function field(
  text: string,
  presence: FieldValue["presence"],
  sourceSegmentIds: string[] = [],
): FieldValue {
  return { text, presence, sourceSegmentIds, reviewed: false }
}

const SYNTHETIC_TRANSCRIPT: TranscriptSegment[] = [
  {
    id: "seg-1",
    speaker: "Médico",
    startMs: 0,
    text: "Esta es una consulta de demostración con datos sintéticos. ¿Qué le trae hoy?",
  },
  {
    id: "seg-2",
    speaker: "Paciente",
    startMs: 4000,
    text: "Dolor de rodilla izquierda desde hace tres días, sin golpe. Ejemplo ficticio.",
  },
  {
    id: "seg-3",
    speaker: "Médico",
    startMs: 12000,
    text: "Queda como borrador para revisión. No hay diagnóstico de este prototipo.",
  },
]

function syntheticNote(): ClinicalNote {
  return {
    sections: {
      visit_context: field(
        "Consulta ambulatoria de demostración por dolor de rodilla izquierda.",
        "STATED",
        ["seg-1", "seg-2"],
      ),
      clinical_narrative: field(
        "El paciente de ejemplo refiere dolor de tres días, sin trauma mencionado.",
        "STATED",
        ["seg-2"],
      ),
      relevant_history: field("", "NOT_STATED"),
      reported_findings: field(
        "No se dictó exploración en esta pista sintética.",
        "UNKNOWN",
        ["seg-3"],
      ),
      clinician_documented_assessment: field(
        "El médico indicó que esto es un borrador de demostración, no una evaluación clínica.",
        "STATED",
        ["seg-3"],
      ),
      clinician_documented_plan: field("", "NOT_STATED"),
      follow_up: field("", "NOT_STATED"),
    },
  }
}

export function formatNoteAsText(note: ClinicalNote): string {
  return SECTION_IDS.map((id) => {
    const section = note.sections[id]
    const body =
      section.presence === "NOT_STATED"
        ? "No consta en la consulta."
        : section.presence === "UNKNOWN"
          ? "Sin determinar."
          : section.text
    return `${SECTION_TITLES[id]}\n${body}`
  }).join("\n\n")
}

export function createMockBridge(): DemoBridge {
  let activeId: string | null = null

  return {
    async startEncounter() {
      activeId = crypto.randomUUID()
      return { encounterId: activeId, startedAt: new Date().toISOString() }
    },
    async stopEncounter(encounterId) {
      if (encounterId !== activeId) {
        throw new Error("Consulta desconocida")
      }
    },
    async generateNote(encounterId) {
      if (encounterId !== activeId) {
        throw new Error("Consulta desconocida")
      }
      return {
        transcript: SYNTHETIC_TRANSCRIPT,
        note: syntheticNote(),
      }
    },
    async saveNote() {
      await wait(150)
    },
  }
}

export { SYNTHETIC_TRANSCRIPT, syntheticNote }
