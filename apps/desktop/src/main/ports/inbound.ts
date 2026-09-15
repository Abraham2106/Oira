import type { ClinicalNote } from "@oira/types"
import type {
  GenerateNoteResult,
  RetryAudioCleanupResult,
  SaveNoteResult,
} from "../../shared/types/oira-api"
import type { AuthProfile, AuthSessionState } from "../../shared/types/auth-profile"

/**
 * Driving (inbound) ports. IPC, tests, and future CLIs call these.
 * Contracts live here so adapters/services implement them, not the reverse.
 */

export type NotesPort = {
  generate: (encounterId: string) => Promise<GenerateNoteResult>
  save: (input: {
    encounterId: string
    note: ClinicalNote
    clinicianConfirmed: true
  }) => Promise<SaveNoteResult>
  retryAudioCleanup: (encounterId: string) => Promise<RetryAudioCleanupResult>
}

export type ExportNoteCommand = {
  encounterId: string
  format: "txt" | "json" | "pdf" | "fhir"
  presentation?: "sections" | "soap"
}

export type ExportPort = {
  exportNote: (input: ExportNoteCommand) => Promise<{ exported: true }>
}

export type SessionPort = {
  isAuthenticated: () => boolean
  unlock: (pin: string) => Promise<{ unlocked: true }>
  lock: () => Promise<{ locked: true }>
}

export type GoogleAuthPort = {
  signIn: () => Promise<AuthProfile>
  signOut: () => Promise<{ signedOut: true }>
  session: () => AuthSessionState
}

export type { EncounterPort } from "../encounters/encounter.types"
