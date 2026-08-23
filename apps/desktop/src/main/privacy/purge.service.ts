import type {
  EncounterRepository,
  NotesRepository,
  TranscriptRepository,
} from "../../shared/types/repositories"

export type PrivacyAudioPort = {
  cleanup: (encounterId: string) => Promise<void>
  listEncounterIds: () => Promise<string[]>
}

export type StorageInventory = {
  encounters: number
  transcripts: number
  notes: number
  audioDirs: number
}

export type PurgePort = {
  purgeEncounter: (encounterId: string) => Promise<{ purged: true }>
  purgeAudio: (encounterId: string) => Promise<void>
  purgeTranscript: (encounterId: string) => Promise<void>
  recoverOrphans: () => Promise<{ orphanAudioDirs: number }>
  inventory: () => Promise<StorageInventory>
}

export function createPurgeService(deps: {
  audio: PrivacyAudioPort
  encounters: EncounterRepository
  transcripts: TranscriptRepository
  notes: NotesRepository
}): PurgePort {
  return {
    async purgeAudio(encounterId) {
      await deps.audio.cleanup(encounterId)
      await deps.encounters.setAudioMeta(encounterId, {
        audioDeletedAt: new Date().toISOString(),
      })
    },

    async purgeTranscript(encounterId) {
      await deps.transcripts.deleteByEncounterId(encounterId)
    },

    async purgeEncounter(encounterId) {
      await deps.audio.cleanup(encounterId)
      await deps.notes.deleteByEncounterId(encounterId)
      await deps.transcripts.deleteByEncounterId(encounterId)
      await deps.encounters.delete(encounterId)
      return { purged: true as const }
    },

    async recoverOrphans() {
      const [dirs, records] = await Promise.all([
        deps.audio.listEncounterIds(),
        deps.encounters.list(),
      ])
      const known = new Set(records.map((row) => row.id))
      let orphanAudioDirs = 0
      for (const id of dirs) {
        if (known.has(id)) continue
        await deps.audio.cleanup(id)
        orphanAudioDirs += 1
      }
      return { orphanAudioDirs }
    },

    async inventory() {
      const [encounters, transcripts, notes, audioDirs] = await Promise.all([
        deps.encounters.list(),
        deps.transcripts.listEncounterIds(),
        deps.notes.listEncounterIds(),
        deps.audio.listEncounterIds(),
      ])
      return {
        encounters: encounters.length,
        transcripts: transcripts.length,
        notes: notes.length,
        audioDirs: audioDirs.length,
      }
    },
  }
}
