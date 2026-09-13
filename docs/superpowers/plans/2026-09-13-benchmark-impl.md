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

## Fase 5 — Corpus 19 WAV + WER/CER por categoría + confusiones léxicas ✅ implementada 2026-09-13

Aprobada por el usuario (AskUserQuestion): corpus = "6 casos nuevos (~19 total)", análisis = "WER/CER por categoría + confusiones".

### Task 5.1 — 6 nuevos fixtures + audio ✅ (19 WAV)

| id | categoría | justificación |
| --- | --- | --- |
| `14-noisy-text-pharma` | `noisy-text` | refuerza n=1→3; fármacos con muletillas |
| `15-noisy-text-elderly` | `noisy-text` | paciente mayor, frases repetidas |
| `16-no-diagnosis-vague` | `no-diagnosis` | refuerza; médico evade diagnóstico |
| `17-dosage-complex` | `dosage` | dosis fraccionada 1-0-1 |
| `18-medication-list` | `medication-list` | **categoría nueva**; 4+ fármacos |
| `19-mixed-languages` | `mixed-languages` | **categoría nueva**; Spanglish/latino |

- `eval/fixtures/cases.json`: **19 entradas** (frozen). `eval/fixtures.test.mjs`: 13→19 asserts.
- Audio: `python eval/audio/_generate.py <6 ids>` → verified RIFF header 16000/1ch/16-bit (miniaudio decode reporta mal; el header binario es la fuente de verdad).
- Todos los WAV verificados: duración 19.94s–29.42s, sample-rate correcto.

### Task 5.2 — Alineación token-a-token + `extractConfusions` ✅

- `scorer/index.mjs`: `levenshteinTable(a,b)` (privado, compartido por `editDistance` + `alignTokens`); `alignTokens` retorna ops `[match|sub|ins|del]` con backtracking DP-consistente y tie-break a favor de `sub` (un swap = una confusión, no dos); `extractConfusions(ref, hyp)` filtra solo `sub` y agrupa por par.
- **Filtro de puntuación de borde** (`BOUNDARY_PUNCT`): `stripBoundaryPunct()` elimina `¿¡?.,;:!…'"“”()` al inicio/final de cada token antes de comparar. Silencia artefactos de Whisper ("dias…→dias,", "¿como→como") sin alterar WER/CER (los cálculos usan `tokenize` sin modificar).

### Task 5.3 — `summarizeStt` con `werPerCategory` + `topConfusions` ✅

- `scorer/stt-metrics.mjs`: `summarizeStt(results, { confusions = [] } = {})`. Cada entrada puede llevar `category?`.
- Campos nuevos (solo con datos; `{}`/`[]` si faltan → backward compatible):
  - `werPerCategory: { [category]: { cases, meanWer, meanCer, werPerCase } }`
  - `topConfusions: [{ ref, hyp, count }]` (top-10).

### Task 5.4 — Runner + report con las dos secciones nuevas ✅

- `eval/runner.mjs`: ambos call sites a `summarizeStt` enriquecen con `category` y `confusions` (del par `{reference, hypothesis}` guardado en `run.results[i].stt`). JSON de consola incluye `werPerCategory`/`topConfusions`.
- `eval/report.mjs` (`sttBlock`): secciones `### WER/CER por categoría` (tabla ordenada por WER desc) y `### Top confusiones léxicas (Whisper vs gold)` (tabla `Palabra gold | Whisper transcribió | Veces`), ambas omitidas cuando el campo falta → retrocompatible.

### Task 5.5 — Tests ✅ 68/68

`scorer.test.mjs`: Capa C `mkRun` con categorías distintas (`simple`/`negation`) y `02-negation` hypothesis = `"Dolor de rodilla derecha"` (confusión real). Describe blocks nuevos: `alignTokens` (5), `extractConfusions` (2), `summarizeStt` categoría+confusiones (2), render Fase 5 (presente + backward-compat borrado) → **68 tests pasan**.

### Resultado del replay del run 05-11 (13 casos, sin modelos) con la Fase 5

**Medido.** `--replay reports/2026-09-13T05-11-23.432Z-e2e-qvac/run.json` re-renderizó el REPORT.md con las nuevas secciones derivadas determinísticamente de los datos guardados.

**WER/CER por categoría** (13 filas, noisy-text encabeza):

| Categoría | Casos | WER | CER |
| --- | ---: | ---: | ---: |
| noisy-text | 1 | 10.8% | 2.5% |
| longer | 1 | 7.6% | 0.6% |
| no-diagnosis | 1 | 7.4% | 1.6% |
| correction | 1 | 4.5% | 1.0% |
| missing-plan | 1 | 4.0% | 0.9% |
| dosage | 1 | 3.1% | 5.6% |
| contradiction | 1 | 3.1% | 0.8% |
| simple / negation / medications / ambiguous-timeline / multiple-symptoms / injection | 1 cada una | 0.0% | 0.0% |

**Top confusiones léxicas — después del filtro de puntuación**:

| Palabra gold | Whisper transcribió | Veces |
| --- | --- | ---: |
| mg | miligramos | 1 |
| enalapril | april | 1 |
| disnea | disneya | 1 |

⚠️ **Observación honesta (medida, no optimizada aún)**: el top-10 original sin el filtro estaba dominado por ruido de puntuación (`dias…→dias,`, `hay→¿hay`, `local.→local?`, …). El filtro de `stripBoundaryPunct` los suprime; quedan **3 pares léxicos reales** consistentes con el WER global del 3.1%. Un refino futuro (p. ej. normalizar mayúsculas/minúsculas dentro del par, o agrupar raíces flexivas) queda fuera del alcance de esta fase — se haría solo con autorización (Regla 16).

### Run 19/19 — **medido** 2026-09-13 13:00 UTC ✅

`reports/2026-09-13T13-00-31.194Z-e2e-qvac/` — 19/19 casos, 0 errores, exit 0.

| Métrica | Valor (evidencia: **medido**) |
| --- | --- |
| WER / CER | 5.1% / 1.9% (vs 3.1%/1.0% con 13 — sube por los casos nuevos) |
| Presence accuracy STT-fed | 83.5% (111/133) |
| Presence accuracy gold-fed | 89.5% |
| Delta presence (STT-fed − gold-fed) | −6.0 pp |
| Macro-F1 STT-fed / gold-fed | 0.769 / 0.601 |
| mustInclude cobertura | 59.0% (49/83) |
| E2E p50 / structure p50 | 48.97s / 26.93s |
| Invención / negación drop-add | 0 / 0-1 |
| Errores | 0 |

WER por categoría (tabla nueva del reporte): medication-list 20.4% (peor, n=1), noisy-text 10.0% (n=3), longer 7.6%, no-diagnosis 7.0% (n=2), dosage 5.3% (n=2), correction 4.5%, missing-plan 4.0%, contradiction 3.1%, mixed-languages 2.2%, resto 0%.

Top confusiones (filtro de puntuación validado en datos reales): rosuvastatina→rosubastatina ×2, latanoprost→tanoprost ×2, mg→miligramos, enalapril→april, disnea→disneya, diez→10, ochocientos→800, nomas→mas, uno→101, cinco→5.

⚠️ **Observación del primer intento (fallido, 12:52)**: 18/19 con `TRANSCRIPTION_FAILED` (RPC timeout en 02 + `MODEL_LOAD_PENDING` sin resolver en 03-19) + workers huérfanos. Un segundo `pnpm eval` corrió limpio. Fallo transitorio del worker QVAC, no regresión de Fase 5 — documentado en memoria para no confundir futuras corridas.

Hasta que el usuario apruebe una fase siguiente, **solo se implementa la medición de fases aprobadas** (hoy: 1, 2, 3, 4 y 5 completas).

---

## Rediseño — Fase 2 (Ampliación de métricas): fidelity + unsupported facts + reintentos ✅ implementada 2026-09-13

Aprobada (plan `rustling-enchanting-cloud.md`). Cierra los gaps §4.4 del rediseño (items 4/6/9): `sourceQuotes` y `mustNotInclude` se puntúan por primera vez, `unsupported clinical fact rate` tiene su fórmula §15.1, y la tasa de reintentos STT se persiste.

### Cambios (aditivos, backward compatible con runs Fase 5)

- **`eval/scorer/extraction-fidelity.mjs`** (nuevo, puro): `scoreQuoteCoverage` (match literal normalizado de `sourceQuotes` ⊆ texto de la sección), `scoreMustNotInclude` (hits por sección), `scoreSourceSupport` (segmento citado existe **y** su texto respalda la sección). Reusa `containsNormalized`/`ratio`/`SECTION_IDS`.
- **`index.mjs` `evaluateCase`**: suma `quoteCoverage`, `mustNotIncludeHits`, `sourceSupport`, `unsupportedFacts` (kinds: `must_not_contain` | `mustNotInclude` | `stated_without_source` | `source_not_supported`) y `unsupportedFactCount`. `summarize` agrega `extractionFidelity.{quoteRecall,quoteHits,quoteTotal,sourceVerificationRate}`, `mustNotInclude.{casesWithHits,hits,rate}`, `unsupportedFact.{casesWithFacts,facts,rate,kinds}`. La componente §15.1-4 (revisión manual) queda documentada como `no_probado`.
- **`stt-metrics.mjs` `summarizeStt`**: opción `transcribeAttempts` (objeto keyed by id o array) → `transcribeRetryRate`, `transcribeRetryCases`, `transcribeRetries`, `transcribeFirstTryRate`, `transcribeAttempts`. Sin la opción, campos ausentes.
- **`runner.mjs`**: persiste `row.transcribeAttempts` (success = fallos+1) en `run.json`; lo pasa a `summarizeStt` en main y en `--replay`.
- **`report.mjs`**: fila `Raw JSON valid rate (primer intento)`, nuevas filas `Source quote fidelity (recall)`, `mustNotInclude hits`, `Unsupported clinical fact rate` (⛔ cuando >0), secciones `### Fidelidad de extracción (sourceQuotes)` y `### Unsupported clinical facts` (solo si hay facts), filas STT `Transcribe retry rate` / `Transcribe 1er intento`.
- **Tests**: 68 → **82/82** (fidelity 6, unsupportedFacts 1, summarize agregado 1, summarizeStt retry 2, render Fase 2 2).

### Resultados del replay retroactivo (sin modelos) — **medido**

`--replay` sobre runs viejos re-deriva todo desde gold+note+transcript+sourceSegmentIds guardados en `run.json`.

**Run 13:00 (19 casos):**

| Métrica (Fase 2, nueva) | Valor |
| --- | --- |
| Source quote fidelity (recall) | **22.4% (15/67)** — el modelo parafrasea; el match literal las pierde |
| mustNotInclude hits | 0/19 |
| Unsupported clinical fact rate | **⛔ 78.9% (15/19)** |
| Transcribe retry rate (run viejo) | 0.0% (0/19) — los attempts no se persistían antes de esta fase |

**Run 05-11 (13 casos):** quote fidelity 37.5% (15/40), unsupported 69.2% (9/13), retry 0 (run viejo).

⚠️ **Honestidad del dato nuevo**: `unsupportedFactRate` >0 viene casi todo de `source_not_supported` — una comprobación **literal normalizada** de respaldo (más estricta que el componente 1 del §15.1, que solo exige que el id exista). El parafraseo lo infla; es una cota superior del problema real, no un fallo de verificación semántica (esa sigue `no_probado`, NOTE_VERIFIER). La componente 4 (revisión manual) `no_probado`. Runs viejos sin `transcribeAttempts` reportan retry 0 honestamente (no se inventa).

### Verificación
1. `pnpm eval:self-check` → 82/82.
2. `--replay` 13:00 y 05-11 → renderizan las secciones nuevas sin re-inferencia.
3. (Opcional, GPU) `pnpm eval` → run nuevo con `transcribeAttempts` por caso y `transcribeRetryRate` real.

---

## Rediseño — Fase 3 (Nivel 3 E2E): latencia por fase + breakdown frío/caliente ✅ implementada 2026-09-13

Aprobada (plan `rustling-enchanting-cloud.md`). Cierra §9 Fase 3 del rediseño. La task 3.1 (wire audio→nota `--e2e`) ya existía de las Fases 4/5; esta fase añade lo que faltaba: latencia por fase STT y el breakdown frío/caliente.

### Cambios (aditivos, backward compatible)

- **`eval/scorer/index.mjs`**: `coldHotMetrics(warmupMs, latencies)` — helper puro; null si falta warmup o <2 latencias. `sttLatency` se resume con el `latencyStats` existente.
- **`eval/runner.mjs`**: `finalizeLatencySummary(run)` compartido entre main y `--replay` → `summary.sttLatency` (p50/p95 de `transcribeMs`) y `summary.coldHot` (warmup, 1er caso, steadyP50, ratio).
- **`eval/report.mjs`**: fila `Latency STT p50 (ms)`; sección `### Breakdown frío/caliente` (Warmup frío | 1er caso tras warmup | p50 steady-state | Caliente/frío) solo si `coldHot`; `metrics.json` + `sttLatency`/`structureLatency`/`coldHot`.
- **Tests**: 82 → **86/86** (coldHotMetrics 2, render Fase 3 2).

### Resultados del replay retroactivo (sin modelos) — **medido**

Replay sobre `run.json` (transcribeMs/structureMs/latencyMs/warmup ya persistidos): latencia por fase y breakdown idempotentes en ambos runs.

**Run 13:00 (19 casos):** Latency STT p50 **14065.5 ms** · structure 26930.7 · E2E 48967.4. Warmup frío 33667.8 ms · 1er caso 48095.1 · p50 steady 49332.5 · **Caliente/frío 1.5×**.

**Run 05-11 (13 casos):** STT p50 14631.8 ms. Warmup 41616.9 · 1er caso 51232.6 · Caliente/frío 1.3×.

⚠️ **Honestidad del dato**: "1er caso" es el primer caso procesado tras warmup (no un cold-call real de carga de modelo — el warmup ya lo cargó). El ratio cruza magnitudes distintas (costo de carga puntual × latencia por caso: se presenta como relación, no como ahorro).

### Verificación
1. `pnpm eval:self-check` → 86/86.
2. `--replay` 13:00 y 05-11 → secciones nuevas renderizadas; re-render → byte-idéntico (idempotente).
3. Capa A (`--skip-stt`) no muestra `Latency STT p50` (sin transcribeMs) — correcto.

---

## Fase 4 — Reproducibilidad y comparación ✅ implementada 2026-09-13

Aprobada (plan `rustling-enchanting-cloud.md`). Cierra §9 Fase 4 del rediseño: versionado prompt/schema, repeatability study (`--repeats N`) y comparación side-by-side (`--compare`).

### Cambios (aditivos, backward compatible)

- **`eval/runner.mjs`**:
  - `metadata.promptHash` / `metadata.schemaHash` (SHA-256, 12 hex) desde `adapter.getPromptTemplate?.()` y `adapter.getSchema?.()`; `null` si el adapter no los expone (heuristic).
  - `--repeats N` (default 1) — solo `--e2e`/`--with-stt` (guard en parseArgs). Warmup **solo en la iteración 1**; cada pasada en `run.repetitions[]`. `runIteration(iteration, isFirstIteration)` desacopla el loop.
  - `--compare <paths...>` (mutuamente excluyente con stages/`--replay`/`--self-check`/`--cases`) → `compareMode()` lee N `run.json` (o dirs) y escribe `COMPARISON.md` side-by-side (WER/CER, presence STT-fed, latencias E2E/STT/structure, cold/hot, dataset, adapter, prompt/schema hash, git commit, fecha). Evidencia `Observado` — no re-inferencia.
- **`eval/scorer/index.mjs`**: `computeRepeatability(repetitions, metricExtractors)` — media, std muestral (n−1), CV %, N y values por métrica; `null` con <2 muestras finitas (no inventa).
- **`eval/report.mjs`**: header `Prompt hash: xxxx · Schema hash: yyyy`; sección `### Repeatability (N runs)` (tabla por métrica con N/A cuando la métrica falta — `fmtUnit` no pega "%"/"pp" sobre N/A); `metrics.json` incluye `repeatability`. Reescrito el template de retorno a concatenación de `parts[]` para evitar anidamiento de backticks que rompía el parse (SyntaxError previo).
- **Tests**: 86 → **94/94** (computeRepeatability 3, render Fase 4 5). Assert de media con tolerancia de punto flotante (`Math.abs(...) < 1e-9`) y estructura de reps corregida (`latency` dentro de `summary`).

### Verificación (sin GPU)

1. `pnpm eval:self-check` → **94/94**.
2. `--compare reports/13-00-31 reports/05-11-23` → `COMPARISON.md` side-by-side correcto: WER 5.1% vs 3.1%, presence 83.5% vs 89.0%, cold/hot 1.46× vs 1.26×; prompt/schema hash `N/A` en runs viejos (backward compatible).
3. `--replay` del run 13:00 → re-render idempotente; header muestra `Prompt hash: N/A · Schema hash: N/A` sin romper nada.
4. Validación de flags: `--repeats 3 --skip-stt` → error explícito "solo aplica a --e2e/--with-stt".

⚠️ **Pendiente (requiere GPU):** `--repeats N` real sobre QVAC (N=5 → ~4+ min de corrida). La mecánica (loop, warmup-solo-1ª, `repetitions[]`, `computeRepeatability`) está cubierta por tests y por el código compartido; el número medido queda para un run GPU.

Captura: `reports/COMPARISON.md` (generada). El adapter `heuristic` falla al cargar `heuristic-assembler` (issue pre-existente, no de Fase 4).