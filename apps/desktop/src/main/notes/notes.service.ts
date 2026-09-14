import { runGenerateNote } from "../application/generate-note"
import { encounterNotFoundError } from "../errors/encounters"
import {
  clinicianConfirmationRequiredError,
  invalidStructuredOutputError,
  noteGenerationNotImplementedError,
  noteDraftRequiredError,
  noteSaveNotImplementedError,
} from "../errors/notes"
import { verifySource } from "./verify-source"
import { clinicalNoteSchema } from "../../shared/schemas/clinical.schema"
import type { NoteVerifierPort } from "../../shared/types/note-verification"
import { selectCurrentAcceptedNote } from "../storage/current-note"
import type { EncounterPort, NotesPort } from "../ports/inbound"
import type {
  AudioCapturePort,
  Clock,
  NoteStorePort,
  ProgressPort,
  StructuringPort,
  TranscriptionPort,
  InferenceRuntimePort,
} from "../ports/outbound"

export type { NotesPort }

export type NotesServiceDeps = {
  encounters?: EncounterPort
  createId?: () => string
}

export type NotesPipelineDeps = NotesServiceDeps & {
  transcription: TranscriptionPort
  structuring: StructuringPort
  audio?: AudioCapturePort
  progress?: ProgressPort
  notes?: NoteStorePort
  clock?: Clock
  structureAttempts?: number
  inferenceRuntime?: InferenceRuntimePort
  reviewer?: NoteVerifierPort
}

type GeneratedDraft = Awaited<ReturnType<typeof runGenerateNote>>

const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
}

export function createNotesStub(_deps: NotesServiceDeps = {}): NotesPort {
  return {
    async generate() {
      throw noteGenerationNotImplementedError()
    },
    async save() {
      throw noteSaveNotImplementedError()
    },
  }
}

export function createNotesService(deps: NotesPipelineDeps): NotesPort {
  const drafts = new Map<string, GeneratedDraft>()
  const saveChains = new Map<string, Promise<unknown>>()
  const createId = deps.createId ?? (() => crypto.randomUUID())
  const clock = deps.clock ?? systemClock

  return {
    async generate(encounterId) {
      const generated = await runGenerateNote(encounterId, deps)
      const stored = structuredClone(generated)
      drafts.set(encounterId, stored)
      return structuredClone(stored)
    },
    async save(input) {
      const previous = saveChains.get(input.encounterId) ?? Promise.resolve()
      const current = previous
        .catch(() => undefined)
        .then(async () => {
          if (input.clinicianConfirmed !== true) {
            throw clinicianConfirmationRequiredError()
          }
          const parsed = clinicalNoteSchema.safeParse(input.note)
          if (!parsed.success) throw invalidStructuredOutputError()
          const record = deps.encounters
            ? await deps.encounters.getById(input.encounterId)
            : undefined
          if (deps.encounters && !record) throw encounterNotFoundError()

          const draft = drafts.get(input.encounterId)
          if (!draft || draft.status !== "ok") throw noteDraftRequiredError()
          const transcript = structuredClone(draft.transcript)
          if (!verifySource(parsed.data, transcript)) {
            throw invalidStructuredOutputError()
          }
          if (!deps.notes) throw noteSaveNotImplementedError()
          const existing = selectCurrentAcceptedNote(
            await deps.notes.list(),
            input.encounterId,
          )
          const noteId = existing?.id ?? createId()
          await deps.notes.save({
            id: noteId,
            encounterId: input.encounterId,
            acceptedAt: clock.nowIso(),
            label: record?.label ?? existing?.label ?? "",
            visitType: record?.visitType ?? existing?.visitType ?? "",
            note: structuredClone(parsed.data),
            transcript,
          })
          drafts.set(input.encounterId, {
            status: "ok",
            transcript: structuredClone(transcript),
            note: structuredClone(parsed.data),
          })
          await settleDrafted(deps.encounters, input.encounterId)
          return { noteId }
        })
      saveChains.set(input.encounterId, current)
      try {
        return await current
      } finally {
        if (saveChains.get(input.encounterId) === current) {
          saveChains.delete(input.encounterId)
        }
      }
    },
  }
}

async function settleDrafted(
  encounters: EncounterPort | undefined,
  encounterId: string,
): Promise<void> {
  if (!encounters) return
  try {
    await encounters.advance(encounterId, "drafting")
    await encounters.advance(encounterId, "drafted")
  } catch {
    // Bookkeeping must never mask the pipeline result.
  }
}
