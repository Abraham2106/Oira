export {
  authStatusInputSchema,
  authStatusOutputSchema,
  discardEncounterInputSchema,
  encounterStatusOutputSchema,
  exportNoteInputSchema,
  exportNoteOutputSchema,
  generateNoteInputSchema,
  generateNoteOutputSchema,
  getEncounterInputSchema,
  getEncounterOutputSchema,
  lockInputSchema,
  lockOutputSchema,
  pushAudioChunkInputSchema,
  pushAudioChunkOutputSchema,
  saveNoteInputSchema,
  saveNoteOutputSchema,
  setPinInputSchema,
  setPinOutputSchema,
  startEncounterInputSchema,
  startEncounterOutputSchema,
  stopEncounterInputSchema,
  unlockInputSchema,
  unlockOutputSchema,
} from "./ipc.schema"
export type {
  AuthStatusInput,
  DiscardEncounterInput,
  ExportNoteInput,
  GenerateNoteInput,
  GetEncounterInput,
  LockInput,
  PushAudioChunkInput,
  SaveNoteInput,
  SetPinInput,
  StartEncounterInput,
  StopEncounterInput,
  UnlockInput,
} from "./ipc.schema"
export {
  clinicalFactSchema,
  structuredClinicalFactsSchema,
} from "./clinical.schema"
export type { ClinicalFact, StructuredClinicalFacts } from "./clinical.schema"
export { approvedNoteSchema, draftNoteSchema } from "./notes.schema"
