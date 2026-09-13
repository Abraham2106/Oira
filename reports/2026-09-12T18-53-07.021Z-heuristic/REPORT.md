# Oira eval report — `2026-09-12T18-53-07.021Z-heuristic`

2026-09-12T18:53:07.021Z · capa `undefined` · adapter `heuristic` · Capa A (`--skip-stt`): estructuración sobre transcripción gold; STT no ejecutado.
**Observado.** Rama sin commit · dataset hash `N/A`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 13 |
| Errores de adaptador | 0 |
| Presence accuracy (I4) | 75.8% (69/91) |
| Macro-F1 presencia | 0.483 |
| Invención léxica (casos) | 7.7% (1/13) |
| mustInclude cobertura | 54.0% (27/50) |
| Product emitted rate | 100.0% (13/13) |
| Raw JSON valid rate | no_probado |
| STATED sin sourceSegmentIds | 0 |
| Casos con source IDs inválidos | 0 |
| Latencia p50 (ms) | 0.3 |
| STT WER/CER | no_medido |

**Medido.** Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 13 |
| p50 | 0.3 |
| p95 | 1.9 |
| p99 | 2.6 |
| mean | 0.6 |
| min | 0.2 |
| max | 2.8 |
**Medido.** Wall-clock de structure() por caso exitoso.

**No probado.** STT no ejecutado (--skip-stt)
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.739 | 0.531 | 0.618 | 32 |
| NOT_STATED | 0.765 | 0.912 | 0.832 | 57 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 17 | 15 | 0 |
| NOT_STATED | 5 | 52 | 0 |
| UNKNOWN | 1 | 1 | 0 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 2.8 | 100.0% (7/7) | — | ok |
| 02-negation | 1.3 | 85.7% (6/7) | — | ok |
| 03-medications | 0.6 | 71.4% (5/7) | — | ok |
| 04-dosage | 0.3 | 85.7% (6/7) | — | ok |
| 05-correction | 0.3 | 85.7% (6/7) | — | ok |
| 06-ambiguous-timeline | 0.4 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 0.2 | 57.1% (4/7) | — | ok |
| 08-multiple-symptoms | 0.5 | 71.4% (5/7) | — | ok |
| 09-noisy-text | 0.3 | 71.4% (5/7) | — | ok |
| 10-longer | 0.6 | 57.1% (4/7) | — | ok |
| 11-missing-plan | 0.2 | 71.4% (5/7) | — | ok |
| 12-contradiction | 0.3 | 57.1% (4/7) | — | ok |
| 13-injection | 0.2 | 85.7% (6/7) | faringitis, amoxicilina | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval -- --adapter heuristic      # re-ejecutar Capa A
pnpm eval -- --replay reports/2026-09-12T18-53-07.021Z-heuristic/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.
