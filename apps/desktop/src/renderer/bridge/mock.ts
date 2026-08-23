import {
  SECTION_IDS,
  SECTION_TITLES,
  type ClinicalNote,
  type FieldValue,
  type TranscriptSegment,
} from "@oira/types"

import type { InferenceProgress } from "../../shared/types/inference-progress"
import {
  defaultSettings,
  type AppSettings,
} from "../../shared/schemas/settings.schema"
import { DEMO_AUTH_PROFILE, type AuthProfile, type AuthSessionState } from "../../shared/types/auth-profile"

/** UI fixture for the renderer prototype — not the Main IPC contract. */
export type DemoBridge = {
  startEncounter: (input: {
    label: string
    visitType: string
  }) => Promise<{ encounterId: string; startedAt: string }>
  stopEncounter: (encounterId: string) => Promise<void>
  appendAudio: (input: {
    encounterId: string
    sequence: number
    pcm: number[]
  }) => Promise<void>
  generateNote: (encounterId: string) => Promise<{
    transcript: TranscriptSegment[]
    note: ClinicalNote
  }>
  saveNote: (encounterId: string, note: ClinicalNote) => Promise<void>
  getSettings: () => Promise<AppSettings>
  saveSettings: (input: { uiLocale: AppSettings["uiLocale"] }) => Promise<AppSettings>
  googleSignIn: () => Promise<AuthProfile>
  signOut: () => Promise<{ signedOut: true }>
  getAuthSession: () => Promise<AuthSessionState>
  onInferenceProgress: (listener: (event: InferenceProgress) => void) => () => void
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
    text: "¿Qué le trae hoy? Cuénteme qué siente y desde cuándo.",
  },
  {
    id: "seg-2",
    speaker: "Paciente",
    startMs: 4000,
    text: "Dolor en la rodilla izquierda desde hace tres días, sin golpe ni caída. Me duele sobre todo al subir escaleras.",
  },
  {
    id: "seg-3",
    speaker: "Médico",
    startMs: 12000,
    text: "La reviso y, según lo que encuentre, coordinamos estudios.",
  },
]

function syntheticNote(): ClinicalNote {
  return {
    sections: {
      visit_context: field(
        "Consulta ambulatoria por dolor en la rodilla izquierda de tres días de evolución.",
        "STATED",
        ["seg-1", "seg-2"],
      ),
      clinical_narrative: field(
        "Refiere dolor de tres días de evolución, sin trauma referido, que aumenta al subir escaleras.",
        "STATED",
        ["seg-2"],
      ),
      relevant_history: field("", "NOT_STATED"),
      reported_findings: field(
        "Exploración física no documentada en la consulta.",
        "UNKNOWN",
        ["seg-3"],
      ),
      clinician_documented_assessment: field(
        "Dolor de rodilla izquierda de características mecánicas; sin datos de alarma mencionados en la consulta.",
        "STATED",
        ["seg-2", "seg-3"],
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
  let settings: AppSettings = { ...defaultSettings }
  let signedIn = false

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
    async appendAudio() {},
    onInferenceProgress() {
      return () => {}
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
    async getSettings() {
      return { ...settings }
    },
    async saveSettings(next) {
      settings = { ...settings, ...next }
      return { ...settings }
    },
    async googleSignIn() {
      await wait(600)
      signedIn = true
      return { ...DEMO_AUTH_PROFILE }
    },
    async signOut() {
      signedIn = false
      return { signedOut: true }
    },
    async getAuthSession() {
      return {
        authenticated: signedIn,
        profile: signedIn ? { ...DEMO_AUTH_PROFILE } : null,
      }
    },
  }
}

export { SYNTHETIC_TRANSCRIPT, syntheticNote }
