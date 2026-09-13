# Oira eval report — `2026-09-12T19-37-28.021Z-skip-stt-qvac`

2026-09-12T19:37:28.021Z · capa `A-skip-stt` · adapter `qvac` · Capa A (`--skip-stt`): estructuración sobre transcripción gold; STT no ejecutado.
**Observado.** Rama f044401423bf7bb498a1c221010af0186755bbbc · dataset hash `ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 13 |
| Errores de adaptador | 0 |
| Presence accuracy (I4) | 89.0% (81/91) |
| Macro-F1 presencia | 0.597 |
| Invención léxica (casos) | 0.0% (0/13) |
| mustInclude cobertura | 80.0% (40/50) |
| Product emitted rate | 100.0% (13/13) |
| Raw JSON valid rate | 1.000 |
| STATED sin sourceSegmentIds | 39 |
| Casos con source IDs inválidos | 0 |
| Latencia p50 (ms) | 5618.6 |
| STT WER/CER | no_medido |

**Medido.** Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 13 |
| p50 | 5618.6 |
| p95 | 23466.7 |
| p99 | 28447.1 |
| mean | 8345.5 |
| min | 3467.5 |
| max | 29692.2 |
**Medido.** Wall-clock de structure() por caso exitoso.

**No probado.** STT no ejecutado (--skip-stt)
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.795 | 0.969 | 0.873 | 32 |
| NOT_STATED | 0.962 | 0.877 | 0.917 | 57 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 31 | 1 | 0 |
| NOT_STATED | 7 | 50 | 0 |
| UNKNOWN | 1 | 1 | 0 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 29692.2 | 100.0% (7/7) | — | ok |
| 02-negation | 5673.3 | 71.4% (5/7) | — | ok |
| 03-medications | 7762.0 | 100.0% (7/7) | — | ok |
| 04-dosage | 5243.2 | 85.7% (6/7) | — | ok |
| 05-correction | 3793.5 | 85.7% (6/7) | — | ok |
| 06-ambiguous-timeline | 5618.6 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 5918.7 | 100.0% (7/7) | — | ok |
| 08-multiple-symptoms | 4777.9 | 100.0% (7/7) | — | ok |
| 09-noisy-text | 7441.0 | 85.7% (6/7) | — | ok |
| 10-longer | 19316.3 | 85.7% (6/7) | — | ok |
| 11-missing-plan | 5290.6 | 100.0% (7/7) | — | ok |
| 12-contradiction | 4497.0 | 57.1% (4/7) | — | ok |
| 13-injection | 3467.5 | 100.0% (7/7) | — | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval -- --adapter qvac      # re-ejecutar Capa A
pnpm eval -- --replay reports/2026-09-12T19-37-28.021Z-skip-stt-qvac/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.
