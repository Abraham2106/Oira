# Q11 — Diarización Sortformer en español y vínculo humano

> **Tipo:** protocolo de laboratorio P1.  
> **Estado:** **BLOCKED — NEEDS TARGET HARDWARE**. No se afirma confiabilidad de diarización ni se muestran roles clínicos.  
> **Dependencias:** [D4](./D4-diarization-reliability.md) y [Q17](./Q17-sortformer-output-shape.md).  
> **Pin requerido:** `@qvac/sdk@0.17.1`.

## Pregunta

¿La diarización Sortformer puede mostrarse como índices neutrales a los que un médico vincula explícitamente su propia identidad, o debe descartarse de la UI?

Q11 no decide quién es médico o paciente. Sólo mide segmentación e índices en 3–5 casos sintéticos españoles con dos hablantes. Una salida «funciona a veces» no es decisión de producto.

## Restricciones confirmadas

- **CONFIRMED:** QVAC documenta Sortformer dentro de Parakeet y un flujo de dos pasos: diarizar, recortar y transcribir con TDT. [QVAC Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/)
- **CONFIRMED:** el ejemplo oficial usa `PARAKEET_SORTFORMER_4SPK_V2_1_Q8_0` y analiza texto con una expresión regular de `Speaker N: inicio - fin`. [Q17](./Q17-sortformer-output-shape.md)
- **DECISIÓN:** P0 no asigna DOCTOR/PATIENT automáticamente; una asociación sólo puede ser explícita, visible y reversible. [D4](./D4-diarization-reliability.md)
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** constante/forma exacta en 0.17.1. No inventar `diarize()`, campos `role` o confianza.

## Fixtures

Construir 3–5 WAV sintéticos españoles, 16 kHz mono, con dos voces, turnos breves, interrupciones y al menos un fragmento solapado. Crear ground truth de intervalos y hablante abstracto A/B; no usar pacientes reales.

| Caso | Variación | Gold de speaker/intervalos | Estado |
| --- | --- | --- | --- |
| D-01 | Turnos limpios | **BLOCKED — NEEDS DATASET** | **BLOCKED — NEEDS TARGET HARDWARE** |
| D-02 | Interrupciones | **BLOCKED — NEEDS DATASET** | **BLOCKED — NEEDS TARGET HARDWARE** |
| D-03 | Solapamiento | **BLOCKED — NEEDS DATASET** | **BLOCKED — NEEDS TARGET HARDWARE** |
| D-04 | Pausas/cambio de distancia | **BLOCKED — NEEDS DATASET** | **BLOCKED — NEEDS TARGET HARDWARE** |
| D-05 | Opcional, acento/ritmo | **BLOCKED — NEEDS DATASET** | **BLOCKED — NEEDS TARGET HARDWARE** |

## Método

1. Verificar SDK, constante y forma textual con Q17; si diverge, detener y abrir `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`.
2. Ejecutar Sortformer sobre cada WAV sintético; conservar la salida bruta.
3. Aplicar sólo el parser estricto de Q17. Rechazar líneas o tiempos inválidos.
4. Comparar con gold: número de índices, estabilidad del mismo índice dentro de caso, fragmentaciones, fusiones, intercambios, error de límites y comportamiento en solapamiento.
5. Si procede, recortar los intervalos y ejecutar TDT como el ejemplo oficial; borrar los WAV temporales tras revisar.
6. No etiquetar índices con roles. La UI de prueba, si se habilita, sólo propone «Hablante 0/1» y solicita vínculo humano explícito.
7. Registrar si un vínculo humano sería comprensible y reversible; no usarlo para reescribir la nota.

## Tabla de resultados vacía

| Caso | ¿Carga OK? | Forma Q17 válida | Nº speakers gold / salida | Índice estable | Flips | Fragmentaciones | Fusiones | Error de límites | Solapamiento | Decisión por caso |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| D-01 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| D-02 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| D-03 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| D-04 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |
| D-05 | **BLOCKED — NEEDS TARGET HARDWARE** |  |  |  |  |  |  |  |  |  |

## Decisión posterior

| Resultado agregado | Decisión |
| --- | --- |
| Forma válida y estabilidad suficiente según criterios acordados antes de medir | Mostrar índices neutrales y permitir vínculo humano por consulta. |
| Flips/fusiones/solapamiento hacen insegura la interpretación | Descartar diarización de UI. |
| Forma no coincide o carga falla | Bloquear y revisar tipos/docs; no ampliar parser. |
| Falta hardware/dataset | **BLOCKED — NEEDS TARGET HARDWARE**. |

## Límites

Esta prueba no certifica identificación de personas, precisión clínica, DER generalizable ni comportamiento en consultas reales. Cualquier copy que diga que la app «sabe quién dijo cada cosa» permanece prohibido.

## Fuentes

1. Tether/QVAC. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
2. [D4](./D4-diarization-reliability.md) y [Q17](./Q17-sortformer-output-shape.md).
