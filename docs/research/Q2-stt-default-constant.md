# Q2 — Selección de constante STT predeterminada

> **Tipo:** protocolo de laboratorio P0.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No hay modelo predeterminado elegido.  
> **Depende de:** [Q1](./Q1-whisper-language-es.md), [D1](./D1-qvac-api-audit.md) y [D2](./D2-whisper-spanish-finetunes.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta y decisión futura

Después de que Q1 confirme una ruta española con timestamps, ¿cuál constante debe ser el STT predeterminado?

- `WHISPER_SPANISH_TINY_Q8_0`
- `WHISPER_TINY`

Q2 seleccionará únicamente **el modelo más pequeño que cumpla todos los criterios bloqueantes**. Si ambos fallan, Q2 no elegirá un ganador: escalará a `WHISPER_SMALL_Q8_0` en un experimento nuevo o declarará bloqueada la calidad de STT P0. El estado actual es bloqueado: no hay Q1 concluido, dataset congelado ni corridas.

## Hipótesis

Una de las dos candidatas producirá transcripciones sintéticas españolas que no inventen fármacos, no alteren dosis, no pierdan/inviertan negaciones y conserven segmentos adecuados para grounding. Esta es una hipótesis de laboratorio, no una afirmación sobre precisión clínica, WER, memoria o latencia.

D2 sólo confirma metadatos de catálogo en un snapshot oficial actual; no elige modelo ni mide calidad. [D2](./D2-whisper-spanish-finetunes.md) D1 exige validar contra los tipos realmente instalados. [D1](./D1-qvac-api-audit.md)

## Precondiciones

| Requisito | Evidencia necesaria | Estado |
| --- | --- | --- |
| Q1 viable | Artefacto con salida española y timestamps utilizables | **BLOCKED — NEEDS TARGET HARDWARE** |
| Versión | `npm ls @qvac/sdk` confirma 0.17.1; hash de tipos registrado | **BLOCKED — NEEDS TARGET SDK** |
| Candidatas | Ambas constantes exportadas por la instalación y con descriptor/hash local registrado | **BLOCKED — NEEDS TARGET SDK** |
| Dataset | 13 WAV sintéticos, gold transcript y `must_not_contain` | **BLOCKED — NEEDS DATASET** |
| Revisión gold | Segunda revisión humana y discrepancias resueltas antes de ejecutar | **BLOCKED — NEEDS HUMAN REVIEW** |
| Runner | Conserva salida bruta y calcula métricas sin correcciones clínicas | **BLOCKED — NEEDS TARGET SDK/HARDWARE** |

No añadir `initial_prompt` (Q7), streaming, diarización ni vocabulario adicional; mezclar variables impediría atribuir resultados a la constante STT.

## Dataset T1–T6

| Familia | Propósito | Casos | Ground truth obligatorio | Estado |
| --- | --- | ---: | --- | --- |
| T1 | Consulta simple | 2 | Texto, hash de WAV y segmentación temporal | **BLOCKED — NEEDS DATASET** |
| T2 | Terminología médica | 2 | Términos pronunciados y variantes aceptables definidas antes de correr | **BLOCKED — NEEDS DATASET** |
| T3 | Fármacos | 2 | Fármacos dichos y lista `must_not_contain` | **BLOCKED — NEEDS DATASET** |
| T4 | Ruido/pausas/pronunciación no ideal | 2 | Condición sintética documentada | **BLOCKED — NEEDS DATASET** |
| T5 | Dosis y unidades | 2 | Número, unidad y relación medicamento-dosis | **BLOCKED — NEEDS DATASET** |
| T6 | Negaciones | 3 | Proposición negada y alcance esperado | **BLOCKED — NEEDS DATASET** |

El dataset suma 13. Todo audio será sintético y no contendrá datos de pacientes. Se congela texto, audio y hashes antes de la primera corrida.

## Configuración fija

Para cada celda `modelo × caso`:

1. usar la ruta de idioma que Q1 haya confirmado;
2. solicitar `metadata: true`;
3. usar el mismo WAV, máquina, runner y configuración para ambos modelos;
4. guardar segmentos sin arreglar texto, tiempos, fármacos, dosis o negaciones;
5. registrar versión SDK, SO/arquitectura, constante, checksum local, configuración efectiva y si el modelo estaba cacheado.

Una corrida por celda basta para esta comparación; determinismo de tres corridas pertenece a Q10. Descargas, RAM y latencia no son métricas de calidad de Q2.

## Métricas y criterios bloqueantes

| Métrica | Regla de evaluación | Barra para default | Estado |
| --- | --- | --- | --- |
| Corrida completa | `transcribe` finaliza sin error | Todas deben tener estado registrado | **BLOCKED — NEEDS TARGET HARDWARE** |
| Fármaco inventado (T3) | Fármaco en salida que no existe en gold/lista permitida | **0** | **BLOCKED — NEEDS TARGET HARDWARE** |
| Error de dosis (T5) | Número, unidad o asociación alterados | **0** | **BLOCKED — NEEDS TARGET HARDWARE** |
| Negación perdida/invertida (T6) | Cambio de polaridad u omisión que altera sentido | **0** | **BLOCKED — NEEDS TARGET HARDWARE** |
| Timestamps útiles | Segmentos finitos, ordenables, no invertidos y trazables | Todos los campos necesarios para grounding | **BLOCKED — NEEDS TARGET HARDWARE** |
| Fidelidad complementaria | Diferencia contra transcript gold | Se reporta; no compensa fallos bloqueantes | **BLOCKED — NEEDS TARGET HARDWARE** |

WER puede informarse, pero no puede ocultar un fármaco inventado, una dosis incorrecta o una negación clínica alterada.

## Procedimiento

1. Verificar todas las precondiciones y congelar el manifiesto.
2. Ejecutar los 13 casos con `WHISPER_SPANISH_TINY_Q8_0`.
3. Ejecutar los mismos 13 casos con `WHISPER_TINY`.
4. Calcular métricas directamente sobre la salida bruta; registrar errores exactos.
5. Revisar desacuerdos contra ground truth sin editar la salida.
6. Aplicar el algoritmo de decisión y escribir una justificación reproducible.

Estructura mínima de artefactos:

```text
runs/<timestamp>/<modelo>/<caso>/
  run.json
  stt.raw.json
  transcript.txt
  metrics.json
  review.md
```

## Tablas de resultados vacías

### Detalle por caso

| Modelo | Caso | Familia | ¿Completó? | Fármaco inventado | Error de dosis | Negación fallida | Timestamps útiles | Revisión |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WHISPER_SPANISH_TINY_Q8_0` | T1-01 | T1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |
| `WHISPER_TINY` | T1-01 | T1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |
| … | … | T1–T6 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |

La tabla final tendrá 26 filas. No se publican números de ejemplo.

### Resumen de decisión

| Configuración | Corridas completas | Fármacos inventados | Errores de dosis | Negaciones fallidas | Grounding con timestamps | ¿Cumple bloqueantes? | Decisión |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `WHISPER_SPANISH_TINY_Q8_0` | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  | No decidir |
| `WHISPER_TINY` | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  | No decidir |
| `WHISPER_SMALL_Q8_0` | No ejecutado; sólo escalamiento |  |  |  |  |  | No decidir |

## Algoritmo de decisión posterior

1. Descartar cualquier configuración que falle un criterio bloqueante.
2. Entre las restantes, documentar fidelidad complementaria y discrepancias.
3. Elegir la menor que satisfaga todas las barras.
4. Si ninguna queda, no fijar default: escalar o declarar bloqueo P0.
5. Mantener los resultados y el razonamiento; nunca reescribir resultados brutos.

## Límites

**BLOCKED — NEEDS TARGET HARDWARE:** no hay ejecuciones, resultados, WER, métricas de medicamento/dosis/negación ni default.

**BLOCKED — NEEDS HUMAN REVIEW:** la anotación gold requiere revisión independiente; esa revisión no habilita editar output del modelo.

Q2 no responde a JSON estructurado, inyección, RAM, carga, red ni diarización; esos riesgos pertenecen a otros prompts.

## Fuentes

1. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
3. [D1](./D1-qvac-api-audit.md), [D2](./D2-whisper-spanish-finetunes.md) y [Q1](./Q1-whisper-language-es.md).
