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
import { SECTION_IDS, type ClinicalNote, type FieldValue } from "@oira/types"

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

function sameGeneratedField(input: FieldValue, draft: FieldValue): boolean {
  return input.text === draft.text &&
    input.presence === draft.presence &&
    input.sourceSegmentIds.length === draft.sourceSegmentIds.length &&
    input.sourceSegmentIds.every((id, index) => id === draft.sourceSegmentIds[index])
}

function reconcileClinicianEdits(input: ClinicalNote, draft: ClinicalNote): ClinicalNote {
  return {
    sections: Object.fromEntries(SECTION_IDS.map((id) => {
      const submitted = input.sections[id]
      const generated = draft.sections[id]
      if (sameGeneratedField(submitted, generated)) {
        return [id, { ...submitted, provenance: generated.provenance }]
      }
      return [id, { ...submitted, provenance: "CLINICIAN_EDITED", sourceSegmentIds: [] }]
    })) as ClinicalNote["sections"],
  }
}

export function createNotesStub(_deps: NotesServiceDeps = {}): NotesPort {
  return {
    async generate() {
      throw noteGenerationNotImplementedError()
    },
    async save() {
      throw noteSaveNotImplementedError()
    },
    async retryAudioCleanup() {
      throw noteGenerationNotImplementedError()
    },
  }
}

export function createNotesService(deps: NotesPipelineDeps): NotesPort {
  const drafts = new Map<string, GeneratedDraft>()
  const generations = new Map<string, Promise<Awaited<ReturnType<typeof runGenerateNote>>>>()
  const saveChains = new Map<string, Promise<unknown>>()
  const cleanupPending = new Set<string>()
  const createId = deps.createId ?? (() => crypto.randomUUID())
  const clock = deps.clock ?? systemClock

  return {
    async generate(encounterId) {
      const existing = generations.get(encounterId)
      if (existing) return structuredClone(await existing)
      const current = runGenerateNote(encounterId, {
        ...deps,
        onCleanupFailure: ({ encounterId: failedEncounterId }) => {
          cleanupPending.add(failedEncounterId)
        },
      }).then((generated) => {
        if (generated.cleanup) cleanupPending.add(encounterId)
        else cleanupPending.delete(encounterId)
        const stored = structuredClone(generated)
        drafts.set(encounterId, stored)
        return stored
      })
      generations.set(encounterId, current)
      try {
        return structuredClone(await current)
      } finally {
        if (generations.get(encounterId) === current) generations.delete(encounterId)
      }
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
          if (!draft || draft.status === "draft_unvalidated") throw noteDraftRequiredError()
          const transcript = structuredClone(draft.transcript)
          if (!verifySource(parsed.data, transcript)) {
            throw invalidStructuredOutputError()
          }
          const note = reconcileClinicianEdits(parsed.data, draft.note)
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
            note: structuredClone(note),
            transcript,
          })
          drafts.set(input.encounterId, {
            status: "READY",
            transcript: structuredClone(transcript),
            note: structuredClone(note),
          })
          try {
            await settleDrafted(deps.encounters, input.encounterId)
            return { status: "SAVED" as const, noteId }
          } catch {
            return {
              status: "PERSISTED_TRANSITION_PENDING" as const,
              noteId,
              recovery: { retryable: true as const },
            }
          }
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
    async retryAudioCleanup(encounterId) {
      if (!cleanupPending.has(encounterId)) return { cleaned: true }
      if (!deps.audio) throw noteGenerationNotImplementedError()
      deps.audio.purge(encounterId)
      cleanupPending.delete(encounterId)
      return { cleaned: true }
    },
  }
}

async function settleDrafted(
  encounters: EncounterPort | undefined,
  encounterId: string,
): Promise<void> {
  if (!encounters) return
  const current = await encounters.getById(encounterId)
  if (!current) throw encounterNotFoundError()
  if (current.status === "drafted") return
  if (current.status === "transcribed") await encounters.advance(encounterId, "drafting")
  const afterDrafting = await encounters.getById(encounterId)
  if (!afterDrafting) throw encounterNotFoundError()
  if (afterDrafting.status === "drafted") return
  if (afterDrafting.status !== "drafting") {
    throw invalidStructuredOutputError("The persisted note could not be reconciled with its encounter.")
  }
  await encounters.advance(encounterId, "drafted")
}
