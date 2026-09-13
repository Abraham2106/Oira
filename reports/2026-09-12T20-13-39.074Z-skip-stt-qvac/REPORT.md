# Oira eval report — `2026-09-12T20-13-39.074Z-skip-stt-qvac`

2026-09-12T20:13:39.074Z · capa `A-skip-stt` · adapter `qvac` · Capa A (`--skip-stt`): estructuración sobre transcripción gold; STT no ejecutado.
**Observado.** Rama f044401423bf7bb498a1c221010af0186755bbbc · dataset hash `ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 2 |
| Errores de adaptador | 0 |
| Presence accuracy (I4) | 71.4% (10/14) |
| Macro-F1 presencia | 0.471 |
| Invención léxica (casos) | 0.0% (0/2) |
| mustInclude cobertura | 80.0% (4/5) |
| Product emitted rate | 100.0% (2/2) |
| Raw JSON valid rate | 1.000 |
| STATED sin sourceSegmentIds | 0 |
| Casos con source IDs inválidos | 0 |
| Latencia p50 (ms) | 15649.4 |
| STT WER/CER | no_medido |

**Medido.** Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 2 |
| p50 | 15649.4 |
| p95 | 17415.5 |
| p99 | 17572.5 |
| mean | 15649.4 |
| min | 13687.0 |
| max | 17611.8 |
**Medido.** Wall-clock de structure() por caso exitoso.

**No probado.** STT no ejecutado (--skip-stt)
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.500 | 0.667 | 0.571 | 3 |
| NOT_STATED | 0.800 | 0.889 | 0.842 | 9 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 2 | 1 | 0 |
| NOT_STATED | 1 | 8 | 0 |
| UNKNOWN | 1 | 1 | 0 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 02-negation | 13687.0 | 85.7% (6/7) | — | ok |
| 12-contradiction | 17611.8 | 57.1% (4/7) | — | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval -- --adapter qvac      # re-ejecutar Capa A
pnpm eval -- --replay reports/2026-09-12T20-13-39.074Z-skip-stt-qvac/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.
