# Oira eval report — `2026-09-12T20-15-09.774Z-skip-stt-qvac`

2026-09-12T20:15:09.774Z · capa `A-skip-stt` · adapter `qvac` · Capa A (`--skip-stt`): estructuración sobre transcripción gold; STT no ejecutado.
**Observado.** Rama f044401423bf7bb498a1c221010af0186755bbbc · dataset hash `ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 13 |
| Errores de adaptador | 0 |
| Presence accuracy (I4) | 89.0% (81/91) |
| Macro-F1 presencia | 0.591 |
| Invención léxica (casos) | 0.0% (0/13) |
| mustInclude cobertura | 76.0% (38/50) |
| Product emitted rate | 100.0% (13/13) |
| Raw JSON valid rate | 1.000 |
| STATED sin sourceSegmentIds | 0 |
| Casos con source IDs inválidos | 0 |
| Latencia p50 (ms) | 14436.3 |
| STT WER/CER | no_medido |

**Medido.** Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 13 |
| p50 | 14436.3 |
| p95 | 17580.8 |
| p99 | 17724.0 |
| mean | 14410.9 |
| min | 11232.5 |
| max | 17759.8 |
**Medido.** Wall-clock de structure() por caso exitoso.

**No probado.** STT no ejecutado (--skip-stt)
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.926 | 0.781 | 0.847 | 32 |
| NOT_STATED | 0.875 | 0.982 | 0.926 | 57 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 25 | 7 | 0 |
| NOT_STATED | 1 | 56 | 0 |
| UNKNOWN | 1 | 1 | 0 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 12326.1 | 85.7% (6/7) | — | ok |
| 02-negation | 12699.8 | 85.7% (6/7) | — | ok |
| 03-medications | 17759.8 | 85.7% (6/7) | — | ok |
| 04-dosage | 16754.6 | 100.0% (7/7) | — | ok |
| 05-correction | 11701.2 | 85.7% (6/7) | — | ok |
| 06-ambiguous-timeline | 12315.1 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 17461.4 | 100.0% (7/7) | — | ok |
| 08-multiple-symptoms | 15186.5 | 100.0% (7/7) | — | ok |
| 09-noisy-text | 13080.7 | 100.0% (7/7) | — | ok |
| 10-longer | 15200.3 | 85.7% (6/7) | — | ok |
| 11-missing-plan | 14436.3 | 100.0% (7/7) | — | ok |
| 12-contradiction | 17186.9 | 57.1% (4/7) | — | ok |
| 13-injection | 11232.5 | 85.7% (6/7) | — | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval -- --adapter qvac      # re-ejecutar Capa A
pnpm eval -- --replay reports/2026-09-12T20-15-09.774Z-skip-stt-qvac/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.
