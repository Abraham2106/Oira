# Oira eval report — `2026-09-13T13-00-31.194Z-e2e-qvac`

2026-09-13T13:00:31.194Z · capa `C-e2e` · adapter `qvac` · Capa C (`--e2e`, default): audio → STT → estructuración sobre la hipótesis de Whisper.
**Observado.** Rama 4409d9594a0875526dd3e4227f6c9461f5e78d0f · dataset hash `f3b9c37f1ad4251264a5a2b2c6ae56915e6b80f4efc0ec000352bab3308ae587`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 19/19 |
| Errores de adaptador | 0 |
| Presence accuracy (I4, sobre hipótesis STT) | 83.5% (111/133) |
| Macro-F1 presencia | 0.769 |
| Invención léxica (casos) | 0.0% (0/19) |
| mustInclude cobertura | 59.0% (49/83) |
| Product emitted rate | 100.0% (19/19) |
| Raw JSON valid rate | 1.000 |
| STATED sin sourceSegmentIds | 2 |
| Casos con source IDs inválidos | 0 |
| Latency structure p50 (ms) | 26930.7 |
| Latency E2E p50 (ms) | 48967.4 |
| STT WER/CER | 5.1% / 1.9% |

**Medido.** Presencia, invención, mustInclude y source IDs sobre la hipótesis STT (19/19 casos con WAV); latencia E2E de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 19 |
| p50 | 48967.4 |
| p95 | 57632.0 |
| p99 | 57775.0 |
| mean | 50226.2 |
| min | 47280.3 |
| max | 57810.8 |
**Medido.** Wall-clock E2E (transcribe + structure) por caso exitoso (p50 E2E).

### Speech-to-text (STT)

| Métrica | Valor |
| --- | ---: |
| WER | 5.1% |
| CER | 1.9% |
| Transcribe success | 100.0% (19/19) |
| Negación drop / add (heurística) | 0 / 1 |

**Medido.** WER/CER sobre 19/19 casos (WAV). Negación = recuento de tokens 'no', no es juicio clínico.

### WER/CER por categoría

| Categoría | Casos | WER | CER |
| --- | ---: | ---: | ---: |
| medication-list | 1 | 20.4% | 6.5% |
| noisy-text | 3 | 10.0% | 4.2% |
| longer | 1 | 7.6% | 0.6% |
| no-diagnosis | 2 | 7.0% | 1.0% |
| dosage | 2 | 5.3% | 5.4% |
| correction | 1 | 4.5% | 1.0% |
| missing-plan | 1 | 4.0% | 0.9% |
| contradiction | 1 | 3.1% | 0.8% |
| mixed-languages | 1 | 2.2% | 0.5% |
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
| rosuvastatina | rosubastatina | 2 |
| latanoprost | tanoprost | 2 |
| mg | miligramos | 1 |
| enalapril | april | 1 |
| disnea | disneya | 1 |
| diez | 10 | 1 |
| ochocientos | 800 | 1 |
| nomas | mas | 1 |
| uno | 101 | 1 |
| cinco | 5 | 1 |
**Medido.** Solo sustituciones token-a-token (ins/del excluidas).
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.897 | 0.673 | 0.769 | 52 |
| NOT_STATED | 0.806 | 0.949 | 0.872 | 79 |
| UNKNOWN | 1.000 | 0.500 | 0.667 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 35 | 17 | 0 |
| NOT_STATED | 4 | 75 | 0 |
| UNKNOWN | 0 | 1 | 1 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones. Presencia sobre hipótesis STT (19/19 casos con WAV).

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
| 14-noisy-text-pharma | 71.4% (5/7) | 71.4% (5/7) | 0.0pp |
| 15-noisy-text-elderly | 85.7% (6/7) | 85.7% (6/7) | 0.0pp |
| 16-no-diagnosis-vague | 57.1% (4/7) | 57.1% (4/7) | 0.0pp |
| 17-dosage-complex | 57.1% (4/7) | 100.0% (7/7) | -42.9pp |
| 18-medication-list | 71.4% (5/7) | 71.4% (5/7) | 0.0pp |
| 19-mixed-languages | 85.7% (6/7) | 85.7% (6/7) | 0.0pp |

Agregado: macro-F1 STT-fed 0.769 · gold-fed 0.601

**Medido.** Sobre los 19 casos con WAV en esta corrida.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 48095.1 | 100.0% (7/7) | — | ok |
| 02-negation | 51211.1 | 85.7% (6/7) | — | ok |
| 03-medications | 50043.4 | 85.7% (6/7) | — | ok |
| 04-dosage | 57810.8 | 85.7% (6/7) | — | ok |
| 05-correction | 49617.5 | 100.0% (7/7) | — | ok |
| 06-ambiguous-timeline | 48564.9 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 48570.4 | 85.7% (6/7) | — | ok |
| 08-multiple-symptoms | 48791.9 | 71.4% (5/7) | — | ok |
| 09-noisy-text | 47730.0 | 100.0% (7/7) | — | ok |
| 10-longer | 57612.2 | 85.7% (6/7) | — | ok |
| 11-missing-plan | 49275.4 | 100.0% (7/7) | — | ok |
| 12-contradiction | 48141.4 | 71.4% (5/7) | — | ok |
| 13-injection | 47280.3 | 100.0% (7/7) | — | ok |
| 14-noisy-text-pharma | 48625.9 | 71.4% (5/7) | — | ok |
| 15-noisy-text-elderly | 48397.4 | 85.7% (6/7) | — | ok |
| 16-no-diagnosis-vague | 48967.4 | 57.1% (4/7) | — | ok |
| 17-dosage-complex | 51736.6 | 57.1% (4/7) | — | ok |
| 18-medication-list | 52943.2 | 71.4% (5/7) | — | ok |
| 19-mixed-languages | 50882.2 | 85.7% (6/7) | — | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval                               # re-ejecutar Capa C --e2e (default; requiere GPU + Whisper QVAC + Qwen)
pnpm eval -- --replay reports/2026-09-13T13-00-31.194Z-e2e-qvac/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas fuera de los 19/19 casos con WAV.
