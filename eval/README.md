# Eval Oira (Capa C-E2E + Capas A/B)

Harness de **medición** separado del producto. No cambia prompts, IPC ni UI.

## Layout

| Ruta | Rol |
| --- | --- |
| `scorer/index.mjs` | Métricas puras (presencia I4, invención léxica, latencia, `latencyStats`, WER/CER helpers) |
| `scorer/stt-metrics.mjs` | Métricas STT: `computeSttMetrics`, `summarizeStt`, negación heurística |
| `scorer.test.mjs` / `fixtures.test.mjs` | Self-check sin modelos (render Capas A/B/C) |
| `fixtures/` | 13 casos sintéticos congelados (script + transcript + gold I4 + `audioRef`) |
| `audio/_generate.py` | Generador TTS del corpus (edge-tts → 16 kHz mono WAV) |
| `audio/<id>/audio.wav` | Audio sintético por caso (01, 02, 12 por ahora) |
| `runner.mjs` | CLI: `--skip-stt`, `--with-stt`, `--e2e` (default), `--adapter qvac\|heuristic`, `--replay`, `--cases` |
| `register-ts.mjs` | Resuelve imports TS de Main / `@oira/types` |
| `report.mjs` | `REPORT.md` + `metrics.json` / `cases.json` / `errors.json` |

Salidas: [`reports/`](../reports/README.md).

## Comandos

```bash
pnpm eval:self-check
pnpm eval                                # Capa C --e2e (default): audio → STT → estructuración → presencia + delta gold-fed
pnpm eval -- --skip-stt                  # Capa A: estructuración sobre transcripción gold
pnpm eval -- --with-stt                  # Capa B: solo STT (WER/CER), sin estructuración
pnpm eval -- --adapter heuristic
pnpm eval -- --cases "02,07,13"
pnpm eval -- --replay reports/<run-id>/run.json
```

En PowerShell, cita `--cases` para no romper las comas. `--e2e` es mutuamente excluyente con `--skip-stt` / `--with-stt` (overrides de alcance reducido para aislar un stage).

## Nivel 2 — Clasificación I4 sobre STT real (`--e2e`, default)

Cadena completa por caso: `transcribe(WAV)` → `estructuración sobre la hipótesis de Whisper` → presencia vs gold. Mide a la vez WER/CER, presencia I4 sobre la hipótesis, invención/mustInclude/source IDs, latencia **structure** y **E2E** (percentiles sobre E2E), y el **delta presence gold-fed → STT-fed** (mismos casos, mismo gold; columna de comparación computada en el mismo run).

- Solo se evalúan casos con `audioRef` (hoy 3/13); los demás se omiten (`Sin WAV (omitidos)`), nunca se mezclan con noticias gold-fed.
- Si ningún caso seleccionado tiene WAV → reporte **bloqueado** (`no_probado`), sin tocar modelos.

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
- Nivel 2 (`--e2e`, default): clasificación I4 sobre la hipótesis STT + delta gold-fed→STT-fed; solo casos con WAV.
- Sin pesos QVAC (o sin WAV en `--e2e`/`--with-stt`): el runner escribe un reporte `BLOCKED` (`no_probado`) y no inventa cifras.

## Origen del patrón

Inspirado en el harness de [Albatross](https://github.com/Abraham2106/Albatross) (scorer puro + replay + hashes). **No se copió código** (LICENSE propietaria). Dominio y métricas son I4/Oira.
