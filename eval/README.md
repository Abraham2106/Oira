# Eval Oira (Capa A + Nivel 1 STT)

Harness de **medición** separado del producto. No cambia prompts, IPC ni UI.

## Layout

| Ruta | Rol |
| --- | --- |
| `scorer/index.mjs` | Métricas puras (presencia I4, invención léxica, latencia, WER/CER helpers) |
| `scorer/stt-metrics.mjs` | Métricas Nivel 1 (STT): `computeSttMetrics`, `summarizeStt`, negación heurística |
| `scorer.test.mjs` / `fixtures.test.mjs` | Self-check sin modelos (incluye render Capa B) |
| `fixtures/` | 13 casos sintéticos congelados (script + transcript + gold I4 + `audioRef`) |
| `audio/_generate.py` | Generador TTS del corpus (edge-tts → 16 kHz mono WAV) |
| `audio/<id>/audio.wav` | Audio sintético por caso (01, 02, 12 por ahora) |
| `runner.mjs` | CLI: `--skip-stt`, `--with-stt`, `--adapter qvac\|heuristic`, `--replay`, `--cases` |
| `register-ts.mjs` | Resuelve imports TS de Main / `@oira/types` |
| `report.mjs` | `REPORT.md` + `metrics.json` / `cases.json` / `errors.json` |

Salidas: [`reports/`](../reports/README.md).

## Comandos

```bash
pnpm eval:self-check
pnpm eval -- --adapter heuristic
pnpm eval -- --adapter qvac
pnpm eval -- --with-stt            # Nivel 1: Whisper QVAC sobre WAV → WER/CER
pnpm eval -- --cases "02,07,13"
pnpm eval -- --replay reports/<run-id>/run.json
```

En PowerShell, cita `--cases` para no romper las comas.

## Nivel 1 — Speech-to-text (WER/CER)

`--with-stt` ejecuta **solo** la transcripción (Whisper QVAC local) sobre los WAV sintéticos y compara contra la transcripción gold. La clasificación/presencia queda `no_probado`.

- Referencia: `fixtures/<id>/transcript.json` (texto de cada segmento).
- Hipótesis: salida de `runtime.transcribe({ filePath })` (Whisper QVAC).
- Generación de audio: `python eval/audio/_generate.py` (dev tooling; requiere `pip install edge-tts miniaudio soxr numpy`).
- Negación: heurística de recuento de tokens `no` (drop/add), marcada como heurística en el reporte.

## Pesos QVAC

Caché por defecto: `%LOCALAPPDATA%\Oira\qvac-models` (`qvac.config.mjs`, fuera de OneDrive).

```bash
# Solo Qwen (Capa A). ~2.5 GB. Reanudable.
$env:QVAC_CONFIG_PATH = (Resolve-Path "eval\qvac-local.config.mjs").Path  # opcional
node apps/desktop/scripts/prefetch-qwen.mjs
pnpm eval -- --adapter qvac
```

## Evidencia

Etiquetas obligatorias en reportes: **medido** / **observado** / **inferido** / **no_probado**.

- Capa A (`--skip-stt`): estructuración sobre transcripción gold.
- Nivel 1 (`--with-stt`): WER/CER sobre WAV sintéticos; clasificación `no_probado`.
- Sin pesos QVAC: el runner escribe un reporte `BLOCKED` y no inventa cifras.

## Origen del patrón

Inspirado en el harness de [Albatross](https://github.com/Abraham2106/Albatross) (scorer puro + replay + hashes). **No se copió código** (LICENSE propietaria). Dominio y métricas son I4/Oira.
