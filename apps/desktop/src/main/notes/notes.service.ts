import type { DraftNote, ExportableNote } from "../../shared/types/notes"
import type { TranscriptRepository } from "../transcription/transcript.repository"
import type { EncounterPort } from "../encounters"
import { createAppError, isAppError } from "../utils/app-error"
import { createId as newId } from "../utils/id"
import { renderDraftBody } from "./draft"
import {
  createApprovedVersion,
  createDraftVersion,
} from "./note.versioning"
import {
  createMemoryNotesRepository,
  type NotesRepository,
} from "./notes.repository"
import { createStructuringService } from "./structuring.service"
import type { StructuringPort } from "./structuring.port"

export type NotesPort = {
  generate: (encounterId: string) => Promise<{ draft: DraftNote }>
  save: (input: { encounterId: string; body: string }) => Promise<{ noteId: string }>
  getExportable: (encounterId: string) => Promise<ExportableNote | undefined>
}

export type NotesServiceDeps = {
  encounters: EncounterPort
  transcripts: TranscriptRepository
  notes?: NotesRepository
  structuring?: ReturnType<typeof createStructuringService>
  model?: StructuringPort
  createId?: () => string
  nowIso?: () => string
  onApproved?: (encounterId: string) => Promise<void>
}

export function createNotesService(deps: NotesServiceDeps): NotesPort {
  const notes = deps.notes ?? createMemoryNotesRepository()
  const structuring =
    deps.structuring ?? createStructuringService({ model: deps.model })
  const createId = deps.createId ?? newId
  const nowIso = deps.nowIso ?? (() => new Date().toISOString())

  return {
    async generate(encounterId) {
      const encounter = await deps.encounters.get(encounterId)
      await deps.encounters.beginDrafting(encounterId)
      try {
        const transcript = await deps.transcripts.getByEncounterId(encounterId)
        if (!transcript || encounter.transcriptId !== transcript.id) {
          throw createAppError(
            "INVALID_STATE_TRANSITION",
            "There is no transcript for this encounter.",
            { retryable: false },
          )
        }

        const structured = await structuring.structure(transcript.text)
        const body = renderDraftBody(structured.facts)
        const existing = await notes.getByEncounterId(encounterId)
        const createdAt = nowIso()
        const note =
          existing?.note ??
          {
            id: createId(),
            encounterId,
            currentVersionId: null,
            approvedVersionId: null,
            createdAt,
            updatedAt: createdAt,
          }
        if (!existing) await notes.insertNote(note)

        const version = createDraftVersion({
          id: createId(),
          noteId: note.id,
          encounterId,
          facts: structured.facts,
          body,
          modelName: structured.modelName,
          promptVersion: structured.promptVersion,
          createdAt,
        })
        await notes.insertVersion(version)
        await notes.updateNote({
          ...note,
          currentVersionId: version.id,
          updatedAt: createdAt,
        })
        await deps.encounters.markDrafted(encounterId)

        const draft: DraftNote = {
          kind: "draft",
          id: version.id,
          encounterId,
          facts: structured.facts,
          body,
          model: {
            name: structured.modelName,
            promptVersion: structured.promptVersion,
          },
          generatedAt: createdAt,
        }
        return { draft }
      } catch (error) {
        await deps.encounters.markFailed(encounterId).catch(() => undefined)
        throw isAppError(error)
          ? error
          : createAppError("INVALID_STRUCTURED_OUTPUT", "Note generation failed.", {
              retryable: true,
              cause: error,
            })
      }
    },

    async save(input) {
      const existing = await notes.getByEncounterId(input.encounterId)
      if (!existing?.note.currentVersionId) {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "There is no draft note to approve.",
          { retryable: false },
        )
      }
      const draft = existing.versions.find(
        (version) => version.id === existing.note.currentVersionId,
      )
      if (!draft || draft.kind !== "draft") {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "There is no draft note to approve.",
          { retryable: false },
        )
      }
      if (existing.note.approvedVersionId) {
        throw createAppError(
          "INVALID_STATE_TRANSITION",
          "This encounter already has an approved note.",
          { retryable: false },
        )
      }

      await deps.encounters.get(input.encounterId)
      const createdAt = nowIso()
      const version = createApprovedVersion({
        id: createId(),
        noteId: existing.note.id,
        encounterId: input.encounterId,
        body: input.body,
        createdAt,
      })
      await notes.insertVersion(version)
      await notes.updateNote({
        ...existing.note,
        approvedVersionId: version.id,
        updatedAt: createdAt,
      })
      await deps.encounters.markCompleted(input.encounterId)
      if (deps.onApproved) await deps.onApproved(input.encounterId)
      return { noteId: version.id }
    },

    async getExportable(encounterId) {
      const existing = await notes.getByEncounterId(encounterId)
      if (!existing?.note.approvedVersionId) return undefined
      const approved = existing.versions.find(
        (version) => version.id === existing.note.approvedVersionId,
      )
      if (!approved || approved.kind !== "approved") return undefined
      const draft = existing.versions.find(
        (version) => version.id === existing.note.currentVersionId,
      )
      return {
        note: {
          kind: "approved",
          id: approved.id,
          encounterId,
          body: approved.body,
          approvedBy: "local-user",
          approvedAt: approved.createdAt,
          derivedFromDraftId: draft?.id ?? approved.id,
        },
        facts: draft?.facts ?? null,
        model: {
          name: draft?.modelName ?? null,
          promptVersion: draft?.promptVersion ?? null,
        },
      }
    },
  }
}
