# Q7 — A/B de initial prompt médico

**Estado:** protocolo de laboratorio; no hay A/B ejecutado.  
**Decisión:** DEFER la inclusión de vocabulario médico hasta completar 13 casos en el modelo predeterminado de Q2 sin inserciones.  
**Fuentes consultadas:** 2026-08-22.

## 1. Evidencia documental

La documentación de QVAC para su servidor HTTP indica que un prompt de transcripción se reenvía a Whisper como initial_prompt. Esa documentación pertenece a la ruta HTTP y no confirma la forma exacta de las APIs SDK que utilizará NotaLocal [QVAC, HTTP server](https://docs.qvac.tether.io/cli/http-server/). La guía de transcripción documenta el procesamiento batch/stream y la entrada audioChunk, pero esta evidencia no expone una equivalencia de campos entre configuración de carga y llamada de transcribe [QVAC, Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/).

Por ello, modelConfig.initial_prompt y transcribe.prompt son hipótesis de inspección de tipos, no parámetros que este informe declare existentes.

## 2. Hipótesis

Un vocabulario limitado a nombres de fármacos y la palabra “miligramos” podría mejorar reconocimiento de términos pronunciados. También podría inducir una mención que nunca se dijo. En documentación clínica, cualquier fármaco insertado sin ser pronunciado es un fallo crítico, incluso si otras palabras mejoran.

## 3. Protocolo A/B

1. Fijar modelo/pins de Q2/R-1 y copiar de los tipos instalados los campos disponibles.
2. Preparar 13 clips sintéticos no clínicos; vocabulario, acentos, ruido y transcripciones de referencia se versionan.
3. Ejecutar línea base sin prompt.
4. Si ambos campos existen y son documentados en tipos, probarlos por separado; no combinarlos sin una corrida adicional explícita.
5. Registrar T2, T3 y T5 según la definición aprobada por IA, además de omisiones, sustituciones e inserciones.
6. Revisar manualmente cada mención de fármaco contra el audio/referencia. Una inserción no pronunciada es fail.
7. Repetir en el paquete distribuible si el cambio se adopta.

| Variante | Tipos confirmados | Casos | T2 | T3 | T5 | Inserciones no pronunciadas | Resultado |
|---|---|---:|---|---|---|---|---|
| Sin prompt | BLOCKED — NEEDS TARGET HARDWARE | 0 | | | | | BLOCKED |
| Campo de carga, si existe | BLOCKED | 0 | | | | | BLOCKED |
| Campo de transcribe, si existe | BLOCKED | 0 | | | | | BLOCKED |

## 4. Criterio de decisión

Incluir vocabulario solo si mejora T2/T3/T5 frente a la línea base y el número de inserciones es cero. Si los tipos no exponen un campo, se marca TODO y no se crea un parámetro “plausible”. Si los resultados son mixtos o no se pueden repetir, no se incluye.

## 5. Decisión

**DEFER.** No se añade initial prompt médico en P1 sin tipos instalados y A/B real. Se prohíbe afirmar que un prompt mejora seguridad clínica o reconocimiento de medicamentos antes de esa evidencia.

## Bibliografía

1. QVAC by Tether. [HTTP server](https://docs.qvac.tether.io/cli/http-server/). Consultado el 2026-08-22.
2. QVAC by Tether. [Transcription](https://docs.qvac.tether.io/ai-capabilities/transcription/). Consultado el 2026-08-22.
