# D0 — Síntesis de investigación IA/QVAC para NotaLocal

> **Estado:** consolidación de escritorio. No incluye resultados de inferencia, hardware ni audio.  
> **Fecha:** 22 de agosto de 2026.  
> **Pin de producto pendiente de revalidación local:** `@qvac/sdk@0.17.1`.

## Decisión consolidada

NotaLocal conserva un MVP local, por lotes y conservador:

1. **STT:** se investigan `WHISPER_SPANISH_TINY_Q8_0` y `WHISPER_TINY`, pero no se elige default antes de Q1/Q2.
2. **Estructuración:** el contrato de aplicación exige `json_schema`, validación posterior y grounding; la compatibilidad real con el esquema clínico pertenece a Q3.
3. **Diarización:** queda fuera de P0. Si se intenta después, Sortformer se consume como texto con el formato del ejemplo oficial y se muestran sólo índices neutrales; no se asignan roles médico/paciente.
4. **API:** toda implementación se limita a una allow-list mínima y se detiene ante cualquier firma que no esté presente en los tipos instalados del pin.

La prioridad no es maximizar automatización. Es impedir que una forma de salida, una asignación de hablante o una supuesta mejora de modelo se conviertan en una afirmación clínica no respaldada.

## Entregables consolidados

| ID | Documento | Decisión que aporta | Estado |
| --- | --- | --- | --- |
| D1 | [Auditoría de API QVAC](./D1-qvac-api-audit.md) | Allow-list mínima; no usar APIs inventadas ni streaming P0. | Completado |
| D2 | [Elegibilidad Whisper español](./D2-whisper-spanish-finetunes.md) | Dos candidatas para Q1/Q2; no hay default de escritorio. | Completado |
| D3 | [Salida estructurada](./D3-structured-output-literature.md) | `json_schema` como contrato; JSON válido no equivale a contenido verdadero. | Completado |
| D4 | [Confiabilidad de diarización](./D4-diarization-reliability.md) | P0 sin roles automáticos; asociación humana sólo si Q11 lo permite. | Completado |
| Q17 | [Forma de salida de Sortformer](./Q17-sortformer-output-shape.md) | Texto a parsear según ejemplo oficial, no objeto tipado. | Completado |

## Matriz de decisiones y dependencias

| Tema | Decisión vigente | Evidencia disponible | Dependencia siguiente | Bloqueo |
| --- | --- | --- | --- | --- |
| Superficie SDK | Usar únicamente `loadModel`, `transcribe`, `completion`, `unloadModel` y `cancel` bajo D1. | Docs/API oficial; faltan tipos del pin local. | Instalar e inspeccionar 0.17.1. | **BLOCKED — NEEDS TARGET SDK** |
| `modelType` / campos de configuración | Preferir descriptor de catálogo e inferencia; no elegir literal o campo por memoria. | Fuentes oficiales actuales muestran variaciones de nomenclatura. | Contrastar `.d.ts` de 0.17.1. | **BLOCKED — NEEDS TARGET SDK** |
| STT español | Comparar primero Spanish Tiny Q8 y Tiny. | Registro/documentación oficial; sin calidad medida. | Q1 valida `language: 'es'`; Q2 realiza los 13 casos. | **BLOCKED — NEEDS TARGET HARDWARE** |
| Default STT | No decidido. | Ninguna medición clínica sintética. | Q2. | **BLOCKED — NEEDS TARGET HARDWARE** |
| Structured output | Sólo `json_schema` para el contrato clínico. | D3; la estructura no prueba grounding ni veracidad. | Q3 con esquema completo, parse/Zod/grounding. | **BLOCKED — NEEDS TARGET SDK/HARDWARE** |
| Diagnóstico/prescripción | Prohibidos en el schema y en la salida del producto. | Decisión de producto de NotaLocal. | Revisión de schema y evaluación de hechos no respaldados. | No resoluble sólo con docs |
| Source grounding | Requerido para cada campo `OBSERVED`; las marcas temporales Whisper son necesarias pero no suficientes. | D1/D2; no hay audio de prueba. | Q1/Q2 y verificador de fuentes. | **BLOCKED — NEEDS TARGET HARDWARE** |
| Diarización | Excluida de P0; no hay roles automáticos. | D4. | Q17 ya fija forma; Q11 evalúa estabilidad y errores. | **BLOCKED — NEEDS TARGET HARDWARE** |
| Forma Sortformer | Parsear texto con patrón oficial estricto; no crear `diarize()` ni tipos imaginados. | Q17. | Smoke test de forma y Q11, con datos sintéticos. | **BLOCKED — NEEDS TARGET SDK/HARDWARE** |
| Identidad de hablante | `Speaker N` es índice opaco, no médico/paciente. | D4/Q17. | Vínculo humano reversible sólo si Q11 es viable. | **BLOCKED — NEEDS TARGET HARDWARE** |

## Estado de evidencia

La síntesis usa las etiquetas de las guías:

- **CONFIRMED:** superficie y ejemplos documentados oficialmente; nunca se extrapolan a rendimiento clínico.
- **DECISIÓN / ASSUMPTION:** elecciones explícitas de NotaLocal, por ejemplo excluir roles automáticos de P0.
- **UNVERIFIED:** precisión, estabilidad de speaker index, soporte real de español, uso de memoria, latencia y JSON válido en el modelo concreto.
- **TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION:** todo campo o firma que sólo aparece en documentación de una versión distinta, no está en los tipos instalados, o no coincide con los ejemplos.
- **BLOCKED — NEEDS TARGET SDK/HARDWARE:** cualquier medición o smoke test no realizado.

La diferencia entre el pin objetivo 0.17.1 y fuentes actuales de QVAC es el principal riesgo documental. El código fuente oficial actual y los contratos de catálogo son útiles para orientar el protocolo, pero no validan automáticamente una instalación anterior. La instalación local pineada debe ser la autoridad antes de escribir integración.

## Ruta crítica

```text
D1 + D2
  → inspección local de @qvac/sdk@0.17.1
  → Q1: viabilidad de español y timestamps
  → Q2: selección de STT por métricas bloqueantes
  → Q3: json_schema con modelo de estructuración
  → validación + grounding + revisión médica
```

D3 se ejecuta en paralelo como restricción de diseño de Q3. D4 y Q17 no bloquean el transcript ni la nota borrador P0; sólo delimitan la funcionalidad opcional de diarización:

```text
D4 + Q17
  → smoke test de forma (sin medir precisión)
  → Q11: evaluación de diarización en español
  → índices neutrales + vínculo humano, o descarte de la UI
```

## Reglas que permanecen invariables

1. La conversación es datos delimitados, nunca instrucciones para el modelo.
2. Una gramática JSON no convierte una afirmación clínica en verdadera.
3. `NOT_STATED` y `UNCERTAIN` son salidas válidas; rellenar un valor plausible no lo es.
4. Ningún borrador se exporta sin revisión explícita del médico.
5. No hay fallback de inferencia remota.
6. Un índice de diarización no es una identidad ni un rol clínico.
7. Las APIs no documentadas o no presentes en el pin se marcan `TODO: VERIFY FROM OFFICIAL QVAC DOCUMENTATION`, no se implementan.

## Próximos artefactos de laboratorio, explícitamente diferidos

| Artefacto | Pregunta | Precondiciones mínimas |
| --- | --- | --- |
| Q1 | ¿La ruta STT acepta y produce español con timestamps? | SDK 0.17.1, dos constantes D2, audio sintético, máquina objetivo. |
| Q2 | ¿Cuál candidata cumple fármacos/dosis/negaciones/grounding? | Q1 viable, 13 casos y ground truth. |
| Q3 | ¿El 600M produce JSON válido con el schema completo? | Tipo exacto de `responseFormat`, modelo y runner. |
| Q4–Q6 | ¿RAM, carga y contexto permiten el demo? | Hardware objetivo y modelos cacheados. |
| Q11 | ¿La diarización puede mostrarse con vínculo humano? | Forma Q17 confirmada, 3–5 casos sintéticos españoles y revisión manual. |
| Q14–Q16, Q18–Q19 | Red, logs, caché y optimizaciones. | Entorno controlado y protocolos específicos. |

No se han completado estos artefactos ni se han escrito números de relleno. Esta síntesis no modifica la guía origen; propone que ésta se actualice sólo cuando haya evidencia del SDK instalado o resultados reproducibles.

## Fuentes internas

- [Guía IA/QVAC](../AI_QVAC_TRANSCRIPTION_GUIDE.md)
- [Kit de investigación](./README.md)
- [D1](./D1-qvac-api-audit.md)
- [D2](./D2-whisper-spanish-finetunes.md)
- [D3](./D3-structured-output-literature.md)
- [D4](./D4-diarization-reliability.md)
- [Q17](./Q17-sortformer-output-shape.md)

## Conclusión

La investigación de escritorio ya delimita qué puede programarse con seguridad y qué debe esperar a un laboratorio. El siguiente paso válido no es ampliar funciones: es fijar el SDK real, comprobar su superficie y producir evidencia reproducible con casos sintéticos. Hasta entonces, NotaLocal puede diseñar un pipeline que trate toda salida como borrador y conserve la decisión clínica en el médico.
