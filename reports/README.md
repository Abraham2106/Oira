# Evaluation reports (Oira)

Each run writes a folder under this directory:

```text
reports/<run-id>/
  REPORT.md
  metrics.json
  cases.json
  errors.json
  run.json          # replay source (gitignored when large)
```

Generate:

```bash
pnpm eval:self-check
pnpm eval -- --skip-stt
pnpm eval -- --adapter heuristic
pnpm eval -- --replay reports/<run-id>/run.json
```

Capa A (`--skip-stt`) measures structuring only. WER/CER remain **no medido** until WAV fixtures exist.

Evidence labels in reports: **medido** / **observado** / **inferido** / **no_probado**. Never invent missing metrics.
