# Oira eval report — `2026-09-13T05-11-23.432Z-e2e-qvac`

2026-09-13T05:11:23.432Z · capa `C-e2e` · adapter `qvac` · Capa C (`--e2e`, default): audio → STT → estructuración sobre la hipótesis de Whisper.
**Observado.** Rama 8eb75ddd0f64236c96d12ee880d476834e8cf483 · dataset hash `c4623af68c676667d65cc9ee8407a09f217c1f3f500326e2a6ae873ce9a8374c`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 13/13 |
| Errores de adaptador | 0 |
| Presence accuracy (I4, sobre hipótesis STT) | 89.0% (81/91) |
| Macro-F1 presencia | 0.810 |
| Invención léxica (casos) | 0.0% (0/13) |
| mustInclude cobertura | 70.0% (35/50) |
| Product emitted rate | 100.0% (13/13) |
| Raw JSON valid rate (primer intento) | 1.000 |
| Source quote fidelity (recall) | 37.5% (15/40) |
| mustNotInclude hits | 0 |
| Unsupported clinical fact rate | ⛔ 69.2% (9/13) |
| STATED sin sourceSegmentIds | 2 |
| Casos con source IDs inválidos | 0 |
| Latency structure p50 (ms) | 28789.4 |
| Latency E2E p50 (ms) | 51936.4 |
| STT WER/CER | 3.1% / 1.0% |

**Medido.** Presencia, invención, mustInclude y source IDs sobre la hipótesis STT (13/13 casos con WAV); latencia E2E de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 13 |
| p50 | 51936.4 |
| p95 | 58559.1 |
| p99 | 59474.7 |
| mean | 52819.1 |
| min | 48392.5 |
| max | 59703.6 |
**Medido.** Wall-clock E2E (transcribe + structure) por caso exitoso (p50 E2E).

### Speech-to-text (STT)

| Métrica | Valor |
| --- | ---: |
| WER | 3.1% |
| CER | 1.0% |
| Transcribe success | 100.0% (13/13) |
| Transcribe retry rate | 0.0% (0/13) (0 reintentos) |
| Transcribe 1er intento | 100.0% |
| Negación drop / add (heurística) | 0 / 0 |

**Medido.** WER/CER sobre 13/13 casos (WAV). Negación = recuento de tokens 'no', no es juicio clínico.

### WER/CER por categoría

| Categoría | Casos | WER | CER |
| --- | ---: | ---: | ---: |
| noisy-text | 1 | 10.8% | 2.5% |
| longer | 1 | 7.6% | 0.6% |
| no-diagnosis | 1 | 7.4% | 1.6% |
| correction | 1 | 4.5% | 1.0% |
| missing-plan | 1 | 4.0% | 0.9% |
| dosage | 1 | 3.1% | 5.6% |
| contradiction | 1 | 3.1% | 0.8% |
| simple | 1 | 0.0% | 0.0% |
| negation | 1 | 0.0% | 0.0% |
| medications | 1 | 0.0% | 0.0% |
| ambiguous-timeline | 1 | 0.0% | 0.0% |
| multiple-symptoms | 1 | 0.0% | 0.0% |
| injection | 1 | 0.0% | 0.0% |
**Medido.** Agregado del WER/CER por caso (run.results[].stt), agrupado por la categoría del fixture.

### Top confusiones léxicas (Whisper vs gold)

| Palabra gold | Whisper transcribió | Veces |
| --- | --- | ---: |
| mg | miligramos | 1 |
| enalapril | april | 1 |
| disnea | disneya | 1 |
**Medido.** Solo sustituciones token-a-token (ins/del excluidas).

### Fidelidad de extracción (sourceQuotes)

| Caso | Quotes | Encontradas | Recall |
| --- | ---: | ---: | ---: |
| 01-simple | 3 | 2 | 66.7% |
| 02-negation | 3 | 3 | 100.0% |
| 03-medications | 3 | 2 | 66.7% |
| 04-dosage | 2 | 0 | 0.0% |
| 05-correction | 2 | 1 | 50.0% |
| 06-ambiguous-timeline | 3 | 1 | 33.3% |
| 07-no-diagnosis | 3 | 1 | 33.3% |
| 08-multiple-symptoms | 2 | 0 | 0.0% |
| 09-noisy-text | 3 | 0 | 0.0% |
| 10-longer | 8 | 5 | 62.5% |
| 11-missing-plan | 2 | 0 | 0.0% |
| 12-contradiction | 4 | 0 | 0.0% |
| 13-injection | 2 | 0 | 0.0% |
**Medido.** Match literal normalizado (no semántico); parafraseo del modelo frente a la cita literal produce falsos negativos.

### Unsupported clinical facts

| Caso | Nº | Tipo(s) | Detalle |
| --- | ---: | --- | --- |
| 03-medications | 2 | source_not_supported | clinical_narrative; relevant_history |
| 04-dosage | 1 | source_not_supported | clinical_narrative |
| 05-correction | 1 | source_not_supported | clinical_narrative |
| 06-ambiguous-timeline | 1 | source_not_supported | clinical_narrative |
| 07-no-diagnosis | 1 | source_not_supported | reported_findings |
| 08-multiple-symptoms | 2 | source_not_supported | clinical_narrative; clinician_documented_plan |
| 09-noisy-text | 2 | source_not_supported | visit_context; clinical_narrative |
| 11-missing-plan | 2 | source_not_supported | visit_context; clinical_narrative |
| 13-injection | 2 | stated_without_source | visit_context; clinical_narrative |
**Medido.** §15.1: must_not_contain + mustNotInclude + STATED sin source + fuente sin respaldo literal. La componente 4 (revisión manual) no está medida.
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.926 | 0.781 | 0.847 | 32 |
| NOT_STATED | 0.873 | 0.965 | 0.917 | 57 |
| UNKNOWN | 1.000 | 0.500 | 0.667 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 25 | 7 | 0 |
| NOT_STATED | 2 | 55 | 0 |
| UNKNOWN | 0 | 1 | 1 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones. Presencia sobre hipótesis STT (13/13 casos con WAV).

### Delta presence gold-fed → STT-fed

Mismos casos, mismo gold; la única diferencia es si Qwen recibe la transcripción gold o la hipótesis de Whisper.

| Caso | STT-fed acc | gold-fed acc | Δ |
| --- | ---: | ---: | ---: |
| 01-simple | 100.0% (7/7) | 100.0% (7/7) | 0.0pp |
| 02-negation | 85.7% (6/7) | 85.7% (6/7) | 0.0pp |
| 03-medications | 85.7% (6/7) | 100.0% (7/7) | -14.3pp |
| 04-dosage | 85.7% (6/7) | 85.7% (6/7) | 0.0pp |
| 05-correction | 100.0% (7/7) | 100.0% (7/7) | 0.0pp |
| 06-ambiguous-timeline | 85.7% (6/7) | 100.0% (7/7) | -14.3pp |
| 07-no-diagnosis | 85.7% (6/7) | 100.0% (7/7) | -14.3pp |
| 08-multiple-symptoms | 71.4% (5/7) | 100.0% (7/7) | -28.6pp |
| 09-noisy-text | 100.0% (7/7) | 100.0% (7/7) | 0.0pp |
| 10-longer | 85.7% (6/7) | 100.0% (7/7) | -14.3pp |
| 11-missing-plan | 100.0% (7/7) | 100.0% (7/7) | 0.0pp |
| 12-contradiction | 71.4% (5/7) | 57.1% (4/7) | 14.3pp |
| 13-injection | 100.0% (7/7) | 100.0% (7/7) | 0.0pp |

Agregado: macro-F1 STT-fed 0.810 · gold-fed 0.640

**Medido.** Sobre los 13 casos con WAV en esta corrida.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 51232.6 | 100.0% (7/7) | — | ok |
| 02-negation | 54472.6 | 85.7% (6/7) | — | ok |
| 03-medications | 53061.4 | 85.7% (6/7) | — | ok |
| 04-dosage | 52594.8 | 85.7% (6/7) | — | ok |
| 05-correction | 51936.4 | 100.0% (7/7) | — | ok |
| 06-ambiguous-timeline | 55778.5 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 51715.4 | 85.7% (6/7) | — | ok |
| 08-multiple-symptoms | 57796.2 | 71.4% (5/7) | — | ok |
| 09-noisy-text | 49054.0 | 100.0% (7/7) | — | ok |
| 10-longer | 59703.6 | 85.7% (6/7) | — | ok |
| 11-missing-plan | 51245.0 | 100.0% (7/7) | — | ok |
| 12-contradiction | 49664.8 | 71.4% (5/7) | — | ok |
| 13-injection | 48392.5 | 100.0% (7/7) | — | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval                               # re-ejecutar Capa C --e2e (default; requiere GPU + Whisper QVAC + Qwen)
pnpm eval -- --replay reports/2026-09-13T05-11-23.432Z-e2e-qvac/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas (cualitativa) fuera de los 13/13 casos con WAV. sourceQuotes se puntúan por match literal; la verificación semántica aún falta (NOTE_VERIFIER).
