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

## Fase 2 — Nivel 2 (clasificación I4 sobre STT real) ✅ implementada 2026-09-12

Aprobada por el usuario (2026-09-12) con las correcciones: default `--e2e`, sin mezcla gold-fed en capas STT, denominador STT explícito, latencia doble. Esta fase **fusiona lo que el borrador llamaba Fase 2 y Fase 3**: la cadena audio→STT→estructura mide a la vez clasificación sobre la hipótesis y latencia E2E.

### Task 2.1 — Modelo de capas por `stage` (un comando = reporte completo)

| Comando | stage | Capa | Alcance | Qué reporta |
| --- | --- | --- | --- | --- |
| `pnpm eval` | `e2e` (**default**) | `C-e2e` | solo casos con WAV | WER/CER + presencia I4 sobre hipótesis STT + invención/mustInclude/sourceIds + latencia structure **y** E2E + delta gold-fed→STT-fed |
| `pnpm eval -- --skip-stt` | `off` | `A-skip-stt` | todos | estructuración sobre gold (presencia/latencia structure) |
| `pnpm eval -- --with-stt` | `sttOnly` | `B-with-stt` | solo casos con WAV | solo STT (WER/CER/negación), sin estructuración |
| `pnpm eval -- --replay <run.json>` | — | seg. metadata | seg. run | re-render + re-score determinístico (nunca re-inferencia) |

- `--skip-stt`/`--with-stt` ya no son flags opuestos; son overrides para aislar un stage. `--e2e` mutuamente excluyente con ambos.
- `metadata.stage` es la fuente única (limpia la doble asignación `layer`); `skipStt` queda derivado para compat de report/replay.

### Task 2.2 — Runner `--e2e` ✅

- Bucle e2e por caso: `transcribe(WAV)` → `structure(hipótesis)` → `evaluateCase(gold, transcript=hyp, note)` + `structureMs`/`transcribeMs`/`latencyMs`(E2E).
- Baseline gold-fed **en el mismo run**: `structure(gold)` → `baselinePresence` + `baselinePresencePairs` + `baselineLatencyMs` por resultado (columna de comparación; si falla se excluye sin inventar).
- **Sin mezcla**: B y C corren solo casos con `audioRef`; `summary.skippedNoAudio` cuenta los omitidos; `--e2e --cases <id sin WAV>` falla **antes** de tocar modelos con reporte bloqueado `no_probado`.
- Warmup e2e = `warmTranscribe()` + `warm()`.
- Metadata: `datasetCases` (casos seleccionados) para denominadores `X/13`.

### Task 2.3 — Scorer / reporte ✅

- `latencyStats` exportado desde `scorer/index.mjs` (reusa `summarize`); `summary.structureLatency` desde `structureMs`.
- `summary.baselinePresence` = `presenceMetrics(flatMap(baselinePresencePairs))` solo en e2e.
- `report.mjs` deriva por `stage`: filas `Latency structure p50` + `Latency E2E p50` en C; denominador `WER/CER sobre X/Y casos (WAV)`; fila `Casos | X/Y` + `Sin WAV (omitidos)`; sección **Delta presence gold-fed → STT-fed**; run bloqueado → `no_probado`.
- `replay()` re-agrega `baselinePresence` + `structureLatency` desde los campos guardados en run.json (re-score determinístico; `r.transcript` guardado es la hipótesis STT → fiel).

### Task 2.4 — Tests ✅

51 self-check tests (39→51): Capa C artefacto (presencia medida, denominador 2/13, doble fila latencia, delta table, casos X/13, bloqueado, buildArtifacts), regresión A/B, `latencyStats`. Verificado CLI: exclusividad de flags, bloqueo sin WAV, replay de run C sintético (preserva baseline/structureLatency).

✅ **Ejecutado 2026-09-13** (GPU RTX 2050 4GB, Whisper large-v3-turbo + Qwen3-4B Q4_K_M):

| Métrica | Valor (evidencia: **medido**) |
| --- | --- |
| WER | 1.04% (mean) |
| CER | 0.26% (mean) |
| Presence accuracy (STT-fed, 3/13 casos WAV) | 85.7% |
| Presence accuracy (gold-fed baseline) | 81.0% |
| Delta presence (STT-fed − gold-fed) | +4.8 pp |
| Macro-F1 STT-fed | 0.788 |
| Macro-F1 gold-fed | 0.574 |
| Latencia E2E p50 | 58.98 s |
| Latencia structure p50 | 31.73 s |
| Transcribe p50 (por caso) | ~18 s |
| Negación drop/add | 0 / 0 |
| Transcribe success | 3/3 (100%) |

- `--replay` del run C re-renderiza idéntico (delta, baseline, latencia dual preservadas).
- `pnpm eval:self-check` 51/51 verde.

### Run 2026-09-13T05-11-23 (Fase 4: corpus 13 WAV completo) ✅ 13/13 cases, 0 errores

**Medido.** Run E2E completo sobre los 13 WAV. Fix previo: retry/backoff en transcribe ante `MODEL_LOAD_PENDING` (handoff Qwen→Whisper).

| Métrica | Valor (evidencia: **medido**) |
| --- | --- |
| WER | 3.1% (mean) |
| CER | 1.0% (mean) |
| Presence accuracy (STT-fed, 13/13 casos) | 89.0% (81/91) |
| Presence accuracy (gold-fed baseline) | 94.5% |
| Delta presence (STT-fed − gold-fed) | -5.5 pp |
| Macro-F1 STT-fed | 0.810 |
| Macro-F1 gold-fed | 0.640 |
| Latencia E2E p50 | 51.94 s |
| Latencia structure p50 | 28.79 s |
| Transcribe p50 (por caso) | ~15 s |
| mustInclude cobertura | 70.0% (35/50) |
| Negación drop/add | 0 / 0 |
| Transcribe success | 13/13 (100%) |
| Errores | 0 |

Per-case WER: 01 0%, 02 0%, 03 0%, 04 3.1%, 05 4.5%, 06 0%, 07 7.4%, 08 0%, 09 10.8%, 10 7.6%, 11 4.0%, 12 3.1%, 13 0%.

La presencia por caso destaca dos casos sensibles a ruido de STT: **08-multiple-symptoms** cae 28.6pp (71.4% vs 100%) y **03/06/07/10** caen 14.3pp. WER por categoría: mezclado (07-no-diagnosis 7.4%, 09-noisy-text 10.8%), lo que sugiere el análisis WER-por-categoría que Fase 4 busca.

Fix aplicado en `eval/runner.mjs`: retry con backoff exponencial (2s, 4s, 8s + jitter, máx 3 intentos) solo ante `MODEL_LOAD_PENDING` al transcribir — evita fallo masivo tras handoff Qwen→Whisper del QVAC adapter.

Previo (run 04-31, sin fix): 10/13 casos fallaban con `MODEL_LOAD_PENDING` / RPC timeout; solo 3 transcritos.

## Fase 4+ (diseñada, no implementada aún — no implementar sin aprobación)

| Fase | Alcance | Nota |
| --- | --- | --- |
| Fase 4 | Crecimiento de corpus: generar WAV para los 13 casos; revisar WER por categoría. | ✅ 13 WAV generados + run E2E completo medido (2026-09-13). WER por categoría: análisis en §"Run 05-11". |

Hasta que el usuario apruebe una fase, **solo se implementa la medición de fases aprobadas** (hoy: 1, 2 y 4 completas).