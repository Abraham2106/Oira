# Qwen structured-note generation (P2)

Oira uses Qwen3 4B Q4_K_M for local draft generation. The adapter requests
Spanish output, parses `completion.text` as JSON, and validates the result
against the seven note sections. Generated `STATED` fields require existing
source segment IDs; unknown objects, empty `STATED` text, and missing
citations are rejected rather than sanitized into a draft. This is structural
validation, not semantic evidence checking. See [R-13](research/R-13-domain-invariants-and-ipc.md).

Whisper and Qwen are mutually exclusive residents. Before structuring, Oira
waits for Whisper to unload; before the next recording, `warmTranscription`
waits for Qwen to unload. Qwen remains resident after a note so a clinician
can continue reviewing it without another model transition. There is no
silent spill-to-RAM fallback: a failed load is reported as a failed model
operation.

GPU selection uses QVAC system resources and VRAM/name heuristics. Backend
indices are inferred from VRAM ranking rather than mapped from backend
enumeration; portability across devices is not established. The requested
device is reported separately from effective backend evidence.

The evidence helpers currently return success or no issues; they do not
check overlap, numbers, negation, or empty drafts. The save-time source check
only verifies that cited segment IDs exist, not that the text is supported.
Every generated result remains a draft requiring explicit physician acceptance.

The transcript is delivered to the renderer before the model handoff. Its
progressive display does not delay Whisper unload or Qwen load; a structuring
failure preserves the transcript for review. The handoff reuses device metadata
from Whisper preparation instead of querying system resources again.

Next steps are documented in [the verifier and evaluation plan](NOTE_VERIFIER_P3.md).
For the dated implementation update, see [Abraham's status update](UPDATE_ABRAHAM_2026-09-12.md).
