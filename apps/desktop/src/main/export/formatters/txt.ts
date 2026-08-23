import type { ApprovedNote } from "../../../shared/types/notes"

export function formatNoteTxt(note: ApprovedNote): string {
  return `${note.body.trim()}\n`
}
