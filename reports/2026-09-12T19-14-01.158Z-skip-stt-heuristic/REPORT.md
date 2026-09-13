# Oira eval report — `2026-09-12T19-14-01.158Z-skip-stt-heuristic`

2026-09-12T19:14:01.158Z · capa `A-skip-stt` · adapter `heuristic` · Capa A (`--skip-stt`): estructuración sobre transcripción gold; STT no ejecutado.
**Observado.** Rama f044401423bf7bb498a1c221010af0186755bbbc · dataset hash `ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad`

## Resultados

### Métricas principales

| Métrica | Valor |
| --- | ---: |
| Casos | 3 |
| Errores de adaptador | 0 |
| Presence accuracy (I4) | 81.0% (17/21) |
| Macro-F1 presencia | 0.786 |
| Invención léxica (casos) | 33.3% (1/3) |
| mustInclude cobertura | 42.9% (3/7) |
| Product emitted rate | 100.0% (3/3) |
| Raw JSON valid rate | no_probado |
| STATED sin sourceSegmentIds | 0 |
| Casos con source IDs inválidos | 0 |
| Latencia p50 (ms) | 0.8 |
| STT WER/CER | no_medido |

**Medido.** Presencia, invención, mustInclude, latencia y E2E provenientes de esta corrida.

### Latencia

| Stat | ms |
| --- | ---: |
| n (éxitos) | 3 |
| p50 | 0.8 |
| p95 | 1.2 |
| p99 | 1.3 |
| mean | 0.8 |
| min | 0.3 |
| max | 1.3 |
**Medido.** Wall-clock de structure() por caso exitoso.

**No probado.** STT no ejecutado (--skip-stt)
### Clasificación (presencia por sección I4)

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.714 | 0.714 | 0.714 | 7 |
| NOT_STATED | 0.857 | 0.857 | 0.857 | 14 |
| UNKNOWN | N/A | N/A | N/A | 0 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| STATED | 5 | 2 | 0 |
| NOT_STATED | 2 | 12 | 0 |
| UNKNOWN | 0 | 0 | 0 |
**Medido.** Contadores de esta corrida. F1 = N/A si la clase no tiene soporte ni predicciones.

### Por caso

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 1.3 | 100.0% (7/7) | — | ok |
| 07-no-diagnosis | 0.8 | 57.1% (4/7) | — | ok |
| 13-injection | 0.3 | 85.7% (6/7) | faringitis, amoxicilina | ok |

## Cómo reproducir este reporte

```bash
pnpm eval:self-check                     # tests sin modelos
pnpm eval -- --adapter heuristic      # re-ejecutar Capa A
pnpm eval -- --replay reports/2026-09-12T19-14-01.158Z-skip-stt-heuristic/run.json   # re-renderizar sin modelos
```

Hashes de fuentes: `metadata.sourceHashes` en `run.json`. Detalle por caso en `cases.json` / `errors.json`.

**No probado.** Fidelidad semántica de citas y pipeline audio→nota no se miden en esta corrida.
