# Qwen handoff verification

Local diagnostic, 2026-09-12. Electron 38 runtime and actual QVAC SDK/models; input was generated 0.5-second silent PCM WAV, deleted after each run. No patient input. This measures the model handoff, not full clinical accuracy or an end-to-end UI recording.

## Before

From `handoff-before.log`, milliseconds relative to process start:

- Whisper completed: 22287.
- Whisper unload completed: 22500.
- Repeated system-resource query: 22512–30066 (7554 ms).
- Actual Qwen SDK load request: 30077.
- Delay from transcription completion to load request: **7790 ms**.

## After

From `handoff-after.log`:

- Whisper completed: 20567.
- Whisper unload completed: 20756.
- Actual Qwen SDK load request: 20772.
- Delay from transcription completion to load request: **205 ms**.
- No additional system-resource query between the two models.

Qwen reuses device metadata already obtained when preparing Whisper. Its GPU configuration remains unchanged. The main process continues to unload Whisper before loading Qwen. Animation completion is not part of the backend contract.

These are two diagnostic runs on this machine, not a general performance guarantee. The UI animation was separately verified earlier; this diagnostic does not claim a new full UI end-to-end run.

Validation: 30 targeted tests passed (workflow, inference runtime, transcription and Qwen structuring); typecheck, desktop lint and production build passed.
