import type { ClinicalNote, TranscriptSegment } from "@notalocal/types"

export type TranscriptionInput = {
  filePath: string
}

export type TranscriptionResult = {
  segments: TranscriptSegment[]
}

export type TranscriptionPort = {
  transcribe: (input: TranscriptionInput) => Promise<TranscriptionResult>
}

export type StructuringInput = {
  transcript: TranscriptSegment[]
}

export type StructuringResult = {
  note: ClinicalNote
}

export type StructuringPort = {
  structure: (input: StructuringInput) => Promise<StructuringResult>
}
