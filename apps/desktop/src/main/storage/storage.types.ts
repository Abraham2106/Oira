import type { ClinicalNote, TranscriptSegment } from "@oira/types"

export type StoredNoteRecord = {
  id: string
  acceptedAt: string
  label: string
  visitType: string
  note: ClinicalNote
  transcript: TranscriptSegment[]
}

export interface NoteStorePort {
  save(record: StoredNoteRecord): Promise<void>
  list(): Promise<StoredNoteRecord[]>
  get(id: string): Promise<StoredNoteRecord | null>
  remove(id: string): Promise<void>
}

export type JsonFileFsDeps = {
  readFile(filePath: string): Promise<string>
  writeFile(filePath: string, data: string): Promise<void>
  exists(filePath: string): Promise<boolean>
  mkdir(dirPath: string): Promise<void>
  rename(fromPath: string, toPath: string): Promise<void>
}

export type StorageLogHook = (action: string) => void
