# Q10 — Determinismo con temperatura cero y semilla fija

> **Tipo:** protocolo de laboratorio P1.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se afirma determinismo.  
> **Dependencias:** [D1](./D1-qvac-api-audit.md), [Q3](./Q3-json-schema-600m.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta

¿Tres invocaciones de `completion()` sobre el mismo fixture, con `temp: 0` y `seed: 42` **si esos campos están tipados en la instalación**, producen la misma salida y el mismo JSON canónico en la máquina objetivo?

La conclusión permitida es únicamente: una corrida basta para esa combinación local, o se mantienen tres corridas. Ningún resultado permite afirmar determinismo global, entre versiones, hardware o modelos.

## Fuentes y precondiciones

- **CONFIRMED:** QVAC documenta `completion()`, `events` y `final`. [API Summary v0.17.x](https://docs.qvac.tether.io/reference/api/)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** nombres exactos `temp`, `seed` y cualquier control de Whisper en 0.17.1. D1 prohíbe sustituirlos por nombres plausibles. [D1](./D1-qvac-api-audit.md)
- **DECISIÓN:** mantener `json_schema`, parseo, Zod y grounding de Q3 en todas las repeticiones. [Q3](./Q3-json-schema-600m.md)

Antes de correr, registrar SDK, hash de tipos de completion, modelo/checksum, SO/arquitectura, prompt/schema/fixture hashes y configuración efectiva. Si `temp` o `seed` no están tipados, marcar el campo como no disponible y no improvisar.

## Método

1. Elegir un fixture sintético español de Q3 con estados, negación y citas de origen.
2. Congelar modelo, prompt, schema y transcript.
3. Ejecutar tres `completion()` independientes con la configuración confirmada por tipos.
4. Guardar contenido crudo, bytes UTF-8, JSON parseado, JSON canónico (orden de claves definido por el runner), validación Zod y grounding.
5. Calcular hash byte a byte del texto y hash del JSON canónico.
6. Comparar además cambios clínicamente relevantes: status, value, source_text y segment_id.
7. Opcionalmente, ejecutar una prueba separada de Whisper con temperatura cero **sólo** si su campo está confirmado; no mezclarla con la decisión del LLM.

## Resultados vacíos

| Corrida | Configuración confirmada | Hash bytes | Hash JSON canónico | Zod | Grounding | Drift clínico | Error exacto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |
| 2 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |
| 3 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |

## Decisión posterior

| Observación | Decisión |
| --- | --- |
| Tres hashes y campos clínicos idénticos | Puede evaluarse una corrida para **esa** combinación; documentar el alcance local. |
| Bytes difieren pero JSON/campos son iguales | Mantener tres corridas hasta decidir si la variación es irrelevante para auditoría. |
| Cambia un valor, estado, cita o segmento | Mantener tres; tratarlo como deriva crítica. |
| Falla schema/grounding | No cuenta como determinismo útil; volver a Q3. |
| Campos no tipados o no hay hardware | **BLOCKED — NEEDS TARGET HARDWARE/SDK**. |

## Límites

Temperatura cero y semilla fija no se convierten en garantía de resultados idénticos. Este protocolo no mide calidad clínica ni habilita ocultar una corrida divergente.

## Fuentes

1. Tether/QVAC. [API Summary — v0.17.x](https://docs.qvac.tether.io/reference/api/). Consultado el 2026-08-22.
2. [D1](./D1-qvac-api-audit.md) y [Q3](./Q3-json-schema-600m.md).
