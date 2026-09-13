# Benchmark Redesign — Plan de implementación (Etapa 2)

> Decide de diseño: [`2026-09-13-benchmark-redesign.md`](./2026-09-13-benchmark-redesign.md) (sección 11: 7 decisiones confirmadas).
> **Estado: Fase 1 APROBADA** por el usuario el 2026-09-12 (respuesta "1.A, 2.A, 3. Y si apruebo la fase 1"). Este archivo documenta el plan y su avance real.

## Reglas que rigen la implementación

- **Regla 12:** toda métrica con etiqueta `medido` / `observado` / `inferido` / `no_probado`; nunca inventar números.
- **Regla 16:** primero MEDIR → ANALIZAR → y solo con autorización, OPTIMIZAR. Esta fase es puramente de medición.
- Los reportes distinguen `no medido` (no se ejecutó) de `no probado` (no hay evidencia) de forma explícita.

---

## Fase 1 — Nivel 1 (STT: WER/CER), corpus sintético, solo STT

Decisiones confirmadas del usuario (respuesta "A" en las 7):
1. Corpus de audio = **sintético TTS primero** (edge-tts).
2. STT = **Whisper local QVAC** (el de producción).
3. nota-verifier = **excluido**.
4. Escala = **13 casos fijos + crecer gradualmente**.
5. Albatross = **referencia secundaria (patrones, no código)**.
6. Prioridad = **Nivel 1 (WER/CER) primero**.
7. Multi-máquina = **diferida**.

### Task 1.1 — Corpus TTS sintético (3 WAV) ✅

| Sub-paso | Estado |
| --- | --- |
| `eval/audio/_generate.py` (edge-tts → miniaudio → soxr → WAV 16 kHz mono 16-bit) | ✅ escrito |
| Voces es-MX-JorgeNeural (Médico) / es-MX-DaliaNeural (Paciente) | ✅ |
| Generar 01-simple, 02-negation, 12-contradiction | ✅ (01=20.18s, 02=18.26s, 12=19.34s) |
| Verificar header binario (16000 Hz, 1 ch, 16-bit PCM) | ✅ (el decode de miniaudio reporta mal; la fuente de verdad es el header) |
| `audioRef` + nota en `eval/fixtures/cases.json` | ✅ 2026-09-13 |

Dev tooling: `python eval/audio/_generate.py` (pip: edge-tts, miniaudio, soxr, numpy).

### Task 1.2 — Scorer STT puro ✅ (con tests)

| Sub-paso | Estado |
| --- | --- |
| Exportar `tokenize` / `editDistance` en `scorer/index.mjs` | ✅ |
| `scorer/stt-metrics.mjs`: `computeSttMetrics`, `summarizeStt`, `negationDeltas`, `transcriptText` | ✅ |
| Tests en `scorer.test.mjs` (WER/CER, negación, transcript vacío, resumen) | ✅ 39→42 tests pasan |
| Render Capa B (`renderReport` con `skipStt:false` no inventa clasificación) | ✅ test `Capa B report artifact` |

### Task 1.3 — Runner `--with-stt` (solo STT) ✅

| Sub-paso | Estado |
| --- | --- |
| Quitar bloqueo `Capa B no implementada` | ✅ |
| Adapter qvac expone `transcribingLabel` + `transcribe(filePath)` | ✅ |
| `loadManifest`: `audioRef` desde `eval/audio/<id>/audio.wav` | ✅ |
| Loop STT: `runtime.transcribe({ filePath })` → `computeSttMetrics` vs gold | ✅ |
| Summary STT (`summarizeStt`) + runId/`layer:"B-with-stt"`/`skipStt:false` | ✅ |
| `datasetHash` incluye WAV (`eval/audio`, prefijo `audio/`) | ✅ |

⚠️ **Pendiente de ejecutar de verdad:** el run real `--with-stt` requiere el Whisper QVAC local (GPU). No se ha corrido ninguna transcripción real aún → **no hay WER/CER medido publicado**. Los tests verifican la mecánica con datos simulados y no reportan cifras como si fueran reales.

### Task 1.4 — Reporte sección 6 y evidencia ✅

Las secciones 1, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14 de `REPORT.md` ahora distinguen Capa A (estructuración) de Capa B (solo STT):
- Sección 6: WER/CER, transcribe success, negación drop/add (etiqueta `medido` cuando hay datos reales).
- Secciones 7/8: `no_probado` en Capa B (no se ejecutó estructuración → no se inventa clasificación).
- Sección 14: `no_probado` explícito para corrida solo-STT.

### Task 1.5 — Docs + casos.json ✅

- `eval/README.md`: comando `--with-stt`, sección Nivel 1, evidencia actualizada.
- `eval/fixtures/cases.json`: `audioRef` en 3 casos + nota actualizada (frozen se mantiene).

---

## Fase 2+ (diseñada, NO aprobada aún — no implementar)

| Fase | Alcance | Nota |
| --- | --- | --- |
| Fase 2 | Nivel 2: clasificación I4 sobre transcripción **STT real** (audio→STT→clasificación; compara presencia vs gold) | Requiere ejecutar estructuración sobre hyp. de Whisper, no sobre gold. |
| Fase 3 | Nivel 3: E2E audio→nota (latencia total, producto) | Encadena transcribe + structure. |
| Fase 4 | Crecimiento de corpus: generar WAV para los 13 casos; revisar WER por categoría. | `audioRef` en todos. |
| Fase 5 | Variabilidad múltiple por caso (voces/ritmos/ruido) y hash de reproducibilidad. | —

Hasta que el usuario apruebe una fase, **solo se implementa la medición de la fase 1**.